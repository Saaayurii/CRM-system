import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  JwtPayload,
  RefreshTokenPayload,
} from '../../../common/interfaces/jwt-payload.interface';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class TokenService {
  /**
   * Отдельный JwtService для RS256-подписи. Нельзя переиспользовать основной:
   * он сконфигурирован модулем с `secret` (HS256), а getSecretKey в @nestjs/jwt
   * отдаёт приоритет `this.options.secret` над sign-опцией `privateKey` — поэтому
   * privateKey из sign() игнорируется. Экземпляр без `secret`, только с privateKey.
   */
  private rs256Signer?: JwtService;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateAccessToken(payload: JwtPayload): string {
    const expiresIn = this.configService.get<string>(
      'jwt.accessExpiration',
    ) as any;
    // RS256, если задан приватный ключ (асимметричная подпись: auth подписывает
    // приватным, все сервисы валидируют публичным — компрометация одного сервиса
    // больше не раскрывает секрет подписи). Иначе — прежний HS256 по секрету.
    const privateKey = (process.env.JWT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    if (privateKey) {
      if (!this.rs256Signer) {
        this.rs256Signer = new JwtService({
          privateKey,
          signOptions: { algorithm: 'RS256', expiresIn },
        });
      }
      return this.rs256Signer.sign(payload as any);
    }
    return this.jwtService.sign(payload as any, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn,
    });
  }

  generateRefreshToken(userId: number): { token: string; expiresAt: Date } {
    const payload: RefreshTokenPayload = {
      sub: userId,
    };

    const expiresIn =
      this.configService.get<string>('jwt.refreshExpiration') || '7d';
    const expiresAt = this.calculateExpirationDate(expiresIn);

    const token = this.jwtService.sign(payload as any, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: expiresIn as any,
    });

    return { token, expiresAt };
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    return this.jwtService.verify<RefreshTokenPayload>(token, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
    });
  }

  /** Sign a short-lived, single-purpose token (e.g. a 2FA challenge). */
  signShortLived(payload: Record<string, unknown>, expiresIn: string): string {
    return this.jwtService.sign(payload as any, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: expiresIn as any,
    });
  }

  /** Verify a short-lived token signed with `signShortLived`. Throws if invalid/expired. */
  verifyShortLived<T = Record<string, unknown>>(token: string): T {
    return this.jwtService.verify(token, {
      secret: this.configService.get<string>('jwt.accessSecret'),
    }) as T;
  }

  generateTokenPair(payload: JwtPayload): TokenPair {
    const accessToken = this.generateAccessToken(payload);
    const { token: refreshToken, expiresAt: refreshTokenExpiresAt } =
      this.generateRefreshToken(payload.sub);

    return {
      accessToken,
      refreshToken,
      refreshTokenExpiresAt,
    };
  }

  private calculateExpirationDate(expiresIn: string): Date {
    const now = new Date();
    const match = expiresIn.match(/^(\d+)([smhd])$/);

    if (!match) {
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    let milliseconds: number;
    switch (unit) {
      case 's':
        milliseconds = value * 1000;
        break;
      case 'm':
        milliseconds = value * 60 * 1000;
        break;
      case 'h':
        milliseconds = value * 60 * 60 * 1000;
        break;
      case 'd':
        milliseconds = value * 24 * 60 * 60 * 1000;
        break;
      default:
        milliseconds = 7 * 24 * 60 * 60 * 1000;
    }

    return new Date(now.getTime() + milliseconds);
  }
}
