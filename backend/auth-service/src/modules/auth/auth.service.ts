import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { RegisterCompanyDto } from './dto/register-company.dto';
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
import { CompanyInviteRepository } from './repositories/company-invite.repository';
import { CreateInviteDto } from './dto/create-invite.dto';
import { SessionRepository } from './repositories/session.repository';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { ConfigService } from '@nestjs/config';
import { SessionBlacklistService } from '../../common/services/session-blacklist.service';

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
    private readonly companyInviteRepository: CompanyInviteRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly sessionBlacklist: SessionBlacklistService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    registerDto: RegisterDto,
    userAgent = '',
    ipAddress = '',
  ): Promise<AuthResponseDto> {
    const account = await this.accountRepository.findById(registerDto.accountId);
    if (!account) {
      throw new NotFoundException('Account not found or inactive');
    }

    const existingUser = await this.userRepository.findByEmailAndAccount(registerDto.email, registerDto.accountId);
    if (existingUser) {
      throw new ConflictException('Email already exists');
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

    await this.sessionRepository.enforceLimit(user.id, 5);
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
    // Multi-account flow: when no accountId, check all users with this email
    if (!loginDto.accountId) {
      const allUsers = await this.userRepository.findAllByEmail(loginDto.email);

      if (allUsers.length === 0) {
        const regRequest = await this.registrationRequestRepository.findByEmail(loginDto.email);
        if (regRequest) {
          if (regRequest.status === 0) throw new UnauthorizedException('Ваша заявка на регистрацию ещё не рассмотрена');
          if (regRequest.status === 2) {
            const reason = regRequest.rejectReason ? `: ${regRequest.rejectReason}` : '';
            throw new UnauthorizedException(`Ваша заявка отклонена${reason}`);
          }
        }
        throw new UnauthorizedException('Invalid credentials');
      }

      // Verify password against active users
      const validUsers: typeof allUsers = [];
      for (const u of allUsers) {
        if (!u.isActive || !u.passwordDigest) continue;
        const ok = await this.passwordService.compare(loginDto.password, u.passwordDigest);
        if (ok) validUsers.push(u);
      }

      if (validUsers.length === 0) throw new UnauthorizedException('Invalid credentials');

      // Multiple valid accounts — ask user to pick one
      if (validUsers.length > 1) {
        return {
          accessToken: '',
          refreshToken: '',
          accounts: validUsers.map((u) => ({
            id: u.account.id,
            name: u.account.name,
            logoUrl: (u.account.settings as any)?.logoUrl ?? undefined,
          })),
        };
      }

      // Exactly one match — continue with normal flow using that user
      loginDto = { ...loginDto, accountId: validUsers[0].accountId };
    }

    const user = await this.userRepository.findByEmailAndAccount(loginDto.email, loginDto.accountId!);
    if (!user) throw new UnauthorizedException('Invalid credentials');

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

    const account = await this.accountRepository.findById(user.accountId);
    const isGlobalAdmin = (user.settings as any)?.isGlobalAdmin === true;

    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      accountId: user.accountId,
      accountName: account?.name,
      accountLogoUrl: account?.settings?.logoUrl ?? undefined,
      isGlobalAdmin: isGlobalAdmin || undefined,
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

      const account = await this.accountRepository.findById(user.accountId);
      const isGlobalAdmin = (user.settings as any)?.isGlobalAdmin === true;

      const jwtPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        roleId: user.roleId,
        accountId: user.accountId,
        accountName: account?.name,
        accountLogoUrl: account?.settings?.logoUrl ?? undefined,
        isGlobalAdmin: isGlobalAdmin || undefined,
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
    // Immediately invalidate any access tokens belonging to this session
    await this.sessionBlacklist.revoke(sessionId, 900); // 900s = 15m (access token lifetime)
    // Push real-time force_logout event via notifications-service SSE
    const notificationsUrl =
      this.configService.get<string>('services.notifications') || 'http://localhost:3010';
    fetch(`${notificationsUrl}/notifications/internal/force-logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, sessionId }),
    }).catch((err) => this.logger.warn(`force_logout push failed: ${err.message}`));
    return { message: 'Сессия завершена' };
  }

  async getMe(userId: number): Promise<UserResponseDto> {
    const user = await this.userRepository.findByIdWithRole(userId);
    if (!user) throw new NotFoundException('User not found');
    return this.mapUserToResponse(user);
  }

  // ── Registration Requests ──────────────────────────────────────────

  async createRegistrationRequest(dto: CreateRegistrationRequestDto): Promise<MessageResponseDto> {
    const emailLower = dto.email.trim().toLowerCase();
    const accountId = dto.accountId ?? 1;

    // Check for active user with this email within the same account
    const existingUser = await this.userRepository.findByEmailAndAccount(emailLower, accountId);
    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже зарегистрирован в системе');
    }

    // Check for soft-deleted user (email was used before in this account)
    const deletedUser = await this.userRepository.findDeletedByEmailAndAccount(emailLower, accountId);
    if (deletedUser) {
      throw new ConflictException(
        'Email ранее использовался в системе. Обратитесь к администратору для восстановления доступа',
      );
    }

    // Check for pending request with the same email
    const pendingRequest = await this.registrationRequestRepository.findPendingByEmail(emailLower);
    if (pendingRequest) {
      throw new ConflictException('Заявка с таким email уже подана и ожидает рассмотрения');
    }

    const passwordDigest = await this.passwordService.hash(dto.password);

    await this.registrationRequestRepository.create({
      name: dto.name,
      email: emailLower,
      phone: dto.phone || null,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
      passwordDigest,
      status: 0,
      accountId,
    });

    this.logger.log(`Registration request created: ${emailLower}`);
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

    // Guard: active user with the same email may have been created since the request was submitted
    const activeUser = await this.userRepository.findByEmail(request.email);
    if (activeUser) {
      throw new ConflictException(
        `Пользователь с email ${request.email} уже активен в системе. Отклоните заявку.`,
      );
    }

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

  async registerCompany(
    dto: RegisterCompanyDto,
    userAgent = '',
    ipAddress = '',
  ): Promise<AuthResponseDto> {
    // Validate invite token
    const invite = await this.companyInviteRepository.findByToken(dto.inviteToken);
    if (!invite) throw new BadRequestException('Недействительный инвайт-токен');
    if (invite.usedAt) throw new BadRequestException('Инвайт-токен уже использован');
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      throw new BadRequestException('Инвайт-токен истёк');
    }

    const account = await this.accountRepository.create({
      name: dto.companyName,
      logoUrl: dto.logoUrl,
    });

    const adminRole = await this.roleRepository.findByCode('admin');
    if (!adminRole) throw new NotFoundException('Role admin not found');

    const passwordDigest = await this.passwordService.hash(dto.adminPassword);

    const user = await this.userRepository.create({
      name: dto.adminName,
      email: dto.adminEmail,
      passwordDigest,
      phone: dto.adminPhone,
      account: { connect: { id: account.id } },
      role: { connect: { id: adminRole.id } },
      confirmedAt: new Date(),
    });

    const tokenPair = this.tokenService.generateTokenPair({
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      accountId: user.accountId,
      accountName: account.name,
    });

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
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      accountId: user.accountId,
      accountName: account.name,
      sid: session.id,
    });

    // Mark invite as used
    await this.companyInviteRepository.markUsed(dto.inviteToken, account.id);

    this.logger.log(`Company registered: ${account.name}, admin: ${user.email}`);

    return {
      accessToken,
      refreshToken: tokenPair.refreshToken,
      sessionId: session.id,
      user: this.mapUserToResponse(user),
    };
  }

  // ── Invite management ──────────────────────────────────────────────────────

  async createInvite(createdBy: number, dto: CreateInviteDto) {
    const token = require('crypto').randomUUID();
    const expiresInHours = dto.expiresInHours ?? 72;
    const expiresAt = expiresInHours > 0
      ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
      : null;
    return this.companyInviteRepository.create({ token, createdBy, note: dto.note, expiresAt });
  }

  async listInvites() {
    return this.companyInviteRepository.findAll();
  }

  async revokeInvite(token: string) {
    const invite = await this.companyInviteRepository.findByToken(token);
    if (!invite) throw new NotFoundException('Инвайт не найден');
    if (invite.usedAt) throw new BadRequestException('Нельзя удалить использованный инвайт');
    await this.companyInviteRepository.delete(token);
  }

  async checkInvite(token: string) {
    const invite = await this.companyInviteRepository.findByToken(token);
    if (!invite) return { valid: false, reason: 'not_found' };
    if (invite.usedAt) return { valid: false, reason: 'used' };
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return { valid: false, reason: 'expired' };
    }
    return { valid: true, expiresAt: invite.expiresAt, note: invite.note };
  }

  async getAccounts() {
    const accounts = await this.accountRepository.findAll();
    return accounts.map((a: any) => ({
      id: a.id,
      name: a.name,
      subdomain: a.subdomain,
      logoUrl: a.settings?.logoUrl ?? null,
      status: a.status,
      createdAt: a.createdAt,
      userCount: a._count?.users ?? 0,
    }));
  }

  async updateAccount(id: number, data: { status?: number; name?: string }) {
    return this.accountRepository.update(id, data);
  }

  private mapUserToResponse(user: any): UserResponseDto {
    const isGlobalAdmin = (user.settings as any)?.isGlobalAdmin === true;
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
      isGlobalAdmin: isGlobalAdmin || undefined,
    };
  }
}
