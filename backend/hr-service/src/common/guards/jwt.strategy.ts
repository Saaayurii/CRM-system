import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
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
    });
  }
  async validate(payload: JwtPayload) {
    if (!payload.sub) throw new UnauthorizedException('Invalid token');
    return {
      id: payload.sub,
      email: payload.email,
      roleId: payload.roleId,
      accountId: payload.accountId,
    };
  }
}
