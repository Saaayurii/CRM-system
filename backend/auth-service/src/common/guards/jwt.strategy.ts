import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { PrismaService } from '../../database/prisma.service';
import { SessionBlacklistService } from '../services/session-blacklist.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly blacklist: SessionBlacklistService,
  ) {
    const secret = configService.get<string>('jwt.accessSecret');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Check session blacklist (revoked sessions)
    if (payload.sid && (await this.blacklist.isRevoked(payload.sid))) {
      throw new UnauthorizedException('Session has been revoked');
    }

    const user = await (this.prisma as any).user.findUnique({
      where: { id: payload.sub },
      select: { id: true, isActive: true, deletedAt: true },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User is not active or does not exist');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      roleId: payload.roleId,
      accountId: payload.accountId,
      sid: payload.sid,
    };
  }
}
