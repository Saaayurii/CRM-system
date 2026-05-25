import {
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { UserRepository } from '../repositories/user.repository';
import { AccountRepository } from '../repositories/account.repository';
import { SessionRepository } from '../repositories/session.repository';
import { TokenService } from './token.service';
import { PasswordService } from './password.service';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';

@Injectable()
export class PortalAuthService {
  private readonly logger = new Logger(PortalAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly accountRepository: AccountRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
  ) {}

  async loginByPassword(
    login: string,
    password: string,
    userAgent = '',
    ipAddress = '',
  ): Promise<AuthResponseDto> {
    const access = await (this.prisma as any).clientPortalAccess.findFirst({
      where: { login, isActive: true },
    });
    if (!access || !access.passwordHash || !access.userId) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await this.passwordService.compare(password, access.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    if (access.expiresAt && new Date(access.expiresAt) < new Date()) {
      throw new UnauthorizedException('Portal access expired');
    }

    await (this.prisma as any).clientPortalAccess.update({
      where: { id: access.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueTokens(access.userId, access.clientId, userAgent, ipAddress);
  }

  async loginByMagicToken(
    token: string,
    userAgent = '',
    ipAddress = '',
  ): Promise<AuthResponseDto> {
    const access = await (this.prisma as any).clientPortalAccess.findUnique({
      where: { accessToken: token },
    });
    if (!access || !access.isActive || !access.userId) {
      throw new UnauthorizedException('Invalid or expired access link');
    }
    if (access.expiresAt && new Date(access.expiresAt) < new Date()) {
      throw new UnauthorizedException('Portal access expired');
    }

    await (this.prisma as any).clientPortalAccess.update({
      where: { id: access.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueTokens(access.userId, access.clientId, userAgent, ipAddress);
  }

  private async issueTokens(
    userId: number,
    clientId: number,
    userAgent: string,
    ipAddress: string,
  ): Promise<AuthResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('Portal user not found');
    if (!user.isActive) throw new UnauthorizedException('Portal user is inactive');

    const account = await this.accountRepository.findById(user.accountId);

    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      accountId: user.accountId,
      accountName: account?.name,
      accountLogoUrl: (account?.settings as any)?.logoUrl ?? undefined,
      clientId,
    };

    const tokenPair = this.tokenService.generateTokenPair(jwtPayload);
    await this.sessionRepository.enforceLimit(user.id, 5);
    const session = await this.sessionRepository.create({
      userId: user.id,
      refreshToken: tokenPair.refreshToken,
      expiresAt: tokenPair.refreshTokenExpiresAt,
      userAgent: userAgent || undefined,
      ipAddress: ipAddress || undefined,
    });

    await this.userRepository.updateRefreshToken(
      user.id,
      tokenPair.refreshToken,
      tokenPair.refreshTokenExpiresAt,
    );

    const accessToken = this.tokenService.generateAccessToken({
      ...jwtPayload,
      sid: session.id,
    });

    this.logger.log(`Portal login: user ${user.id} client ${clientId}`);

    return {
      accessToken,
      refreshToken: tokenPair.refreshToken,
      sessionId: session.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roleId: user.roleId,
        accountId: user.accountId,
        avatarUrl: user.avatarUrl ?? undefined,
        accountName: account?.name,
        accountLogoUrl: (account?.settings as any)?.logoUrl ?? undefined,
      } as any,
    };
  }
}
