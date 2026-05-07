import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

const SUPER_ADMIN_ROLE_ID = 1;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
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
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<JwtPayload> {
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
