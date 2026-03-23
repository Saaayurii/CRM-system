import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CreateRegistrationRequestDto } from './dto/create-registration-request.dto';
import { ApproveRegistrationRequestDto } from './dto/approve-registration-request.dto';
import { RejectRegistrationRequestDto } from './dto/reject-registration-request.dto';
import {
  AuthResponseDto,
  UserResponseDto,
  TokenResponseDto,
  MessageResponseDto,
} from './dto/auth-response.dto';
import { UserRepository } from './repositories/user.repository';
import { RoleRepository } from './repositories/role.repository';
import { AccountRepository } from './repositories/account.repository';
import { RegistrationRequestRepository } from './repositories/registration-request.repository';
import { SessionRepository } from './repositories/session.repository';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

function parseUserAgent(ua: string): { browser: string; os: string; device: string } {
  const browser =
    ua.match(/Edg\//)
      ? 'Edge'
      : ua.match(/OPR\/|Opera\//)
        ? 'Opera'
        : ua.match(/Firefox\//)
          ? 'Firefox'
          : ua.match(/Chrome\//)
            ? 'Chrome'
            : ua.match(/Safari\//)
              ? 'Safari'
              : 'Браузер';

  const os =
    ua.match(/Windows/)
      ? 'Windows'
      : ua.match(/Mac OS X/)
        ? 'macOS'
        : ua.match(/iPhone|iPad/)
          ? 'iOS'
          : ua.match(/Android/)
            ? 'Android'
            : ua.match(/Linux/)
              ? 'Linux'
              : 'Неизвестно';

  const device = /Mobile|Android|iPhone|iPad/.test(ua) ? 'mobile' : 'desktop';

  return { browser, os, device };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly accountRepository: AccountRepository,
    private readonly registrationRequestRepository: RegistrationRequestRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async register(
    registerDto: RegisterDto,
    userAgent = '',
    ipAddress = '',
  ): Promise<AuthResponseDto> {
    const existingUser = await this.userRepository.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const account = await this.accountRepository.findById(registerDto.accountId);
    if (!account) {
      throw new NotFoundException('Account not found or inactive');
    }

    const role = await this.roleRepository.findById(registerDto.roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const passwordDigest = await this.passwordService.hash(registerDto.password);

    const user = await this.userRepository.create({
      name: registerDto.name,
      email: registerDto.email,
      passwordDigest,
      phone: registerDto.phone,
      position: registerDto.position,
      account: { connect: { id: registerDto.accountId } },
      role: { connect: { id: registerDto.roleId } },
      confirmedAt: new Date(),
    });

    const tokenPair = this.tokenService.generateTokenPair({
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      accountId: user.accountId,
    });

    const session = await this.sessionRepository.create({
      userId: user.id,
      refreshToken: tokenPair.refreshToken,
      expiresAt: tokenPair.refreshTokenExpiresAt,
      userAgent: userAgent || undefined,
      ipAddress: ipAddress || undefined,
    });

    // Also store on user for backward compat
    await this.userRepository.updateRefreshToken(
      user.id,
      tokenPair.refreshToken,
      tokenPair.refreshTokenExpiresAt,
    );

    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      accountId: user.accountId,
      sid: session.id,
    });

    this.logger.log(`User registered: ${user.email}`);

    return {
      accessToken,
      refreshToken: tokenPair.refreshToken,
      sessionId: session.id,
      user: this.mapUserToResponse(user),
    };
  }

  async login(
    loginDto: LoginDto,
    userAgent = '',
    ipAddress = '',
  ): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByEmail(loginDto.email);
    if (!user) {
      const regRequest = await this.registrationRequestRepository.findByEmail(loginDto.email);
      if (regRequest) {
        if (regRequest.status === 0) {
          throw new UnauthorizedException('Ваша заявка на регистрацию ещё не рассмотрена');
        }
        if (regRequest.status === 2) {
          const reason = regRequest.rejectReason ? `: ${regRequest.rejectReason}` : '';
          throw new UnauthorizedException(`Ваша заявка отклонена${reason}`);
        }
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    if (!user.passwordDigest) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.compare(loginDto.password, user.passwordDigest);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.userRepository.updateSignInInfo(user.id);

    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      accountId: user.accountId,
    };

    const tokenPair = this.tokenService.generateTokenPair(jwtPayload);

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

    this.logger.log(`User logged in: ${user.email}`);

    return {
      accessToken,
      refreshToken: tokenPair.refreshToken,
      sessionId: session.id,
      user: this.mapUserToResponse(user),
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<TokenResponseDto> {
    try {
      const payload = this.tokenService.verifyRefreshToken(refreshTokenDto.refreshToken);

      const user = await this.userRepository.findById(payload.sub);
      if (!user) throw new UnauthorizedException('User not found');
      if (!user.isActive) throw new UnauthorizedException('User account is inactive');

      const jwtPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        roleId: user.roleId,
        accountId: user.accountId,
      };

      const tokenPair = this.tokenService.generateTokenPair(jwtPayload);

      // Try session-based refresh
      const session = await this.sessionRepository.findByRefreshToken(
        refreshTokenDto.refreshToken,
      );

      if (session) {
        await this.sessionRepository.updateToken(
          session.id,
          tokenPair.refreshToken,
          tokenPair.refreshTokenExpiresAt,
        );
        await this.userRepository.updateRefreshToken(
          user.id,
          tokenPair.refreshToken,
          tokenPair.refreshTokenExpiresAt,
        );

        const accessToken = this.tokenService.generateAccessToken({
          ...jwtPayload,
          sid: session.id,
        });

        return { accessToken, refreshToken: tokenPair.refreshToken };
      }

      // Fallback: check User.refreshToken for old sessions
      if (user.refreshToken !== refreshTokenDto.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      if (user.refreshTokenExpiresAt && new Date() > user.refreshTokenExpiresAt) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // Migrate old session to new session table
      const newSession = await this.sessionRepository.create({
        userId: user.id,
        refreshToken: tokenPair.refreshToken,
        expiresAt: tokenPair.refreshTokenExpiresAt,
      });

      await this.userRepository.updateRefreshToken(
        user.id,
        tokenPair.refreshToken,
        tokenPair.refreshTokenExpiresAt,
      );

      const accessToken = this.tokenService.generateAccessToken({
        ...jwtPayload,
        sid: newSession.id,
      });

      this.logger.log(`Tokens refreshed for user: ${user.email}`);
      return { accessToken, refreshToken: tokenPair.refreshToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: number, sessionId?: number): Promise<MessageResponseDto> {
    if (sessionId) {
      await this.sessionRepository.deleteByIdAndUserId(sessionId, userId);
    }
    await this.userRepository.updateRefreshToken(userId, null, null);
    this.logger.log(`User logged out: ${userId}`);
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: number): Promise<MessageResponseDto> {
    await this.sessionRepository.deleteAllByUserId(userId);
    await this.userRepository.clearAllRefreshTokens(userId);
    this.logger.log(`All sessions cleared for user: ${userId}`);
    return { message: 'All sessions terminated successfully' };
  }

  async getSessions(userId: number, currentSessionId?: number) {
    const sessions = await this.sessionRepository.findAllByUserId(userId);
    return sessions.map((s: any) => {
      const parsed = s.userAgent ? parseUserAgent(s.userAgent) : null;
      return {
        id: s.id,
        browser: parsed?.browser || 'Неизвестно',
        os: parsed?.os || 'Неизвестно',
        device: parsed?.device || 'desktop',
        ipAddress: s.ipAddress || null,
        lastSeenAt: s.lastSeenAt,
        createdAt: s.createdAt,
        isCurrent: s.id === currentSessionId,
      };
    });
  }

  async revokeSession(userId: number, sessionId: number): Promise<MessageResponseDto> {
    await this.sessionRepository.deleteByIdAndUserId(sessionId, userId);
    return { message: 'Сессия завершена' };
  }

  async getMe(userId: number): Promise<UserResponseDto> {
    const user = await this.userRepository.findByIdWithRole(userId);
    if (!user) throw new NotFoundException('User not found');
    return this.mapUserToResponse(user);
  }

  // ── Registration Requests ──────────────────────────────────────────

  async createRegistrationRequest(dto: CreateRegistrationRequestDto): Promise<MessageResponseDto> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const pendingRequest = await this.registrationRequestRepository.findPendingByEmail(dto.email);
    if (pendingRequest) {
      throw new ConflictException('Заявка с таким email уже подана и ожидает рассмотрения');
    }

    const passwordDigest = await this.passwordService.hash(dto.password);

    await this.registrationRequestRepository.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone || null,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
      passwordDigest,
      status: 0,
      accountId: 1,
    });

    this.logger.log(`Registration request created: ${dto.email}`);
    return { message: 'Заявка на регистрацию отправлена' };
  }

  async getRegistrationRequests(status?: number) {
    return this.registrationRequestRepository.findAll(status);
  }

  async approveRegistrationRequest(
    id: number,
    dto: ApproveRegistrationRequestDto,
    reviewerUserId: number,
  ): Promise<MessageResponseDto> {
    const request = await this.registrationRequestRepository.findById(id);
    if (!request) throw new NotFoundException('Заявка не найдена');
    if (request.status !== 0) throw new BadRequestException('Заявка уже рассмотрена');

    const role = await this.roleRepository.findById(dto.roleId);
    if (!role) throw new NotFoundException('Роль не найдена');

    await this.userRepository.create({
      name: request.name,
      email: request.email,
      phone: request.phone,
      birthDate: request.birthDate,
      passwordDigest: request.passwordDigest,
      position: dto.position || null,
      account: { connect: { id: request.accountId } },
      role: { connect: { id: dto.roleId } },
      confirmedAt: new Date(),
    });

    await this.registrationRequestRepository.updateStatus(id, {
      status: 1,
      reviewedBy: reviewerUserId,
      reviewedAt: new Date(),
    });

    this.logger.log(`Registration request approved: ${request.email}`);
    return { message: 'Заявка одобрена, пользователь создан' };
  }

  async rejectRegistrationRequest(
    id: number,
    dto: RejectRegistrationRequestDto,
    reviewerUserId: number,
  ): Promise<MessageResponseDto> {
    const request = await this.registrationRequestRepository.findById(id);
    if (!request) throw new NotFoundException('Заявка не найдена');
    if (request.status !== 0) throw new BadRequestException('Заявка уже рассмотрена');

    await this.registrationRequestRepository.updateStatus(id, {
      status: 2,
      rejectReason: dto.reason || null,
      reviewedBy: reviewerUserId,
      reviewedAt: new Date(),
    });

    this.logger.log(`Registration request rejected: ${request.email}`);
    return { message: 'Заявка отклонена' };
  }

  private mapUserToResponse(user: any): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      accountId: user.accountId,
      roleId: user.roleId ?? undefined,
      position: user.position ?? undefined,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
