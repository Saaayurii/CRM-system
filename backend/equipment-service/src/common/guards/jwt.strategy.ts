import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

const SUPER_ADMIN_ROLE_ID = 1;

interface JwtPayload {
  sub: number;
  email: string;
  roleId: number;
  accountId: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('jwt.accessSecret') || 'default-secret',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token');
    }
    let accountId = payload.accountId;
    if (payload.roleId === SUPER_ADMIN_ROLE_ID) {
      const headerValue = req.headers['x-account-id'];
      const overrideId = Array.isArray(headerValue) ? headerValue[0] : headerValue;
      if (overrideId && /^\d+$/.test(String(overrideId))) {
        accountId = Number(overrideId);
      }
    }
    return {
      id: payload.sub,
      email: payload.email,
      roleId: payload.roleId,
      accountId,
    };
  }
}
