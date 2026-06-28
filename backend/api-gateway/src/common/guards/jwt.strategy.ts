import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { buildJwtKeyOptions } from './jwt-key.options';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { SessionRevocationService } from '../services/session-revocation.service';

const SUPER_ADMIN_ROLE_ID = 1;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly revocation: SessionRevocationService,
  ) {
    const secret = configService.get<string>('jwt.accessSecret');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }
    super({
      // Accept token from Authorization header OR ?token= query param (for SSE/EventSource)
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => req?.query?.token as string | null,
      ]),
      ignoreExpiration: false,
      ...buildJwtKeyOptions(configService),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<JwtPayload> {
    // Reject access tokens whose session was logged out / revoked. The
    // signature is still valid (stateless JWT), so without this check the token
    // would live until `exp`. Fails open if Redis is down (see service).
    if (payload.sid && (await this.revocation.isRevoked(payload.sid))) {
      throw new UnauthorizedException('Session has been revoked');
    }

    let accountId = payload.accountId;

    // Super admin can impersonate any account via X-Account-Id header
    if (payload.roleId === SUPER_ADMIN_ROLE_ID) {
      const headerValue = req.headers['x-account-id'];
      const overrideId = Array.isArray(headerValue) ? headerValue[0] : headerValue;
      if (overrideId && /^\d+$/.test(overrideId)) {
        accountId = Number(overrideId);
      }
    }

    return {
      sub: payload.sub,
      email: payload.email,
      roleId: payload.roleId,
      accountId,
    };
  }
}
