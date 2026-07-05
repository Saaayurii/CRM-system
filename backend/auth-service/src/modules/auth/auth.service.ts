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
import { CreateMemberInviteDto } from './dto/create-member-invite.dto';
import { MemberInviteRepository } from './repositories/member-invite.repository';
import { SessionRepository } from './repositories/session.repository';
import { PasswordResetRepository } from './repositories/password-reset.repository';
import { RecoveryLogRepository } from './repositories/recovery-log.repository';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { TotpService } from './services/totp.service';
import { MailService } from './services/mail.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  MAIL_QUEUE,
  MAIL_JOB_PASSWORD_RESET,
  PasswordResetMailJob,
} from './queues/mail.queue';
import * as crypto from 'crypto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { ConfigService } from '@nestjs/config';
import { SessionBlacklistService } from '../../common/services/session-blacklist.service';
import { LoginThrottleService } from '../../common/services/login-throttle.service';

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
    private readonly memberInviteRepository: MemberInviteRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly recoveryLogRepository: RecoveryLogRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly totpService: TotpService,
    private readonly mailService: MailService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
    private readonly sessionBlacklist: SessionBlacklistService,
    private readonly throttle: LoginThrottleService,
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
    const throttleId = `login:${loginDto.email.trim().toLowerCase()}`;
    await this.throttle.assertNotLocked(throttleId);

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
        await this.throttle.recordFailure(throttleId);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Verify password against active users
      const validUsers: typeof allUsers = [];
      for (const u of allUsers) {
        if (!u.isActive || !u.passwordDigest) continue;
        const ok = await this.passwordService.compare(loginDto.password, u.passwordDigest);
        if (ok) validUsers.push(u);
      }

      if (validUsers.length === 0) {
        await this.throttle.recordFailure(throttleId);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Password verified — clear brute-force counters.
      await this.throttle.reset(throttleId);

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

      // Exactly one match — finish login (with 2FA gate when required)
      const only = validUsers[0];
      if (this.shouldRequire2fa(only, only.account)) {
        return this.build2faChallenge(only);
      }
      return this.issueSession(only, only.account, userAgent, ipAddress);
    }

    const user = await this.userRepository.findByEmailAndAccount(loginDto.email, loginDto.accountId!);
    if (!user || !user.passwordDigest) {
      await this.throttle.recordFailure(throttleId);
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    const account = await this.accountRepository.findById(user.accountId);
    const maxAttempts = Number((account?.settings as any)?.max_login_attempts) || undefined;

    const isPasswordValid = await this.passwordService.compare(loginDto.password, user.passwordDigest);
    if (!isPasswordValid) {
      await this.throttle.recordFailure(throttleId, maxAttempts);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Password verified — clear brute-force counters.
    await this.throttle.reset(throttleId);

    if (this.shouldRequire2fa(user, account)) {
      return this.build2faChallenge(user);
    }

    return this.issueSession(user, account, userAgent, ipAddress);
  }

  /**
   * Decide whether a login must pass a 2FA challenge.
   * Super admins (roleId 1 / global admins) are always exempt — they sign in
   * with just login + password. Otherwise a challenge is required when the
   * company enforces 2FA OR the user has personally enabled it.
   */
  private shouldRequire2fa(user: any, account: any): boolean {
    const isSuperAdmin = user?.roleId === 1 || (user?.settings as any)?.isGlobalAdmin === true;
    if (isSuperAdmin) return false;
    const companyRequires = Boolean((account?.settings as any)?.require_2fa);
    const userEnabled = Boolean((user?.settings as any)?.twoFactor?.enabled);
    return companyRequires || userEnabled;
  }

  /** Build the token pair + session for a fully-authenticated user. */
  private async issueSession(
    user: any,
    account: any,
    userAgent = '',
    ipAddress = '',
  ): Promise<AuthResponseDto> {
    await this.userRepository.updateSignInInfo(user.id);

    const isGlobalAdmin = (user.settings as any)?.isGlobalAdmin === true;
    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      accountId: user.accountId,
      accountName: account?.name,
      accountLogoUrl: (account?.settings as any)?.logoUrl ?? undefined,
      isGlobalAdmin: isGlobalAdmin || undefined,
    };

    const tokenPair = this.tokenService.generateTokenPair(jwtPayload);

    // Повторный логин с того же устройства (UA+IP) заменяет прежнюю сессию,
    // чтобы список «Активные сессии» не зарастал дублями одного браузера.
    await this.sessionRepository.deleteByDevice(user.id, userAgent, ipAddress);
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

  /**
   * Build the 2FA challenge returned after a correct password when the account
   * requires 2FA. Already-enrolled users get a 'verify' challenge; users who
   * have not set up an authenticator yet get a 'setup' challenge with a QR code.
   */
  private async build2faChallenge(user: any): Promise<AuthResponseDto> {
    const tf = (user.settings as any)?.twoFactor;

    if (tf?.enabled && tf?.secret) {
      const token = this.tokenService.signShortLived(
        { sub: user.id, accountId: user.accountId, purpose: '2fa-verify' },
        '5m',
      );
      return { accessToken: '', refreshToken: '', twoFactor: { mode: 'verify', token } };
    }

    // Not enrolled yet — generate a pending secret embedded in the (signed) token.
    const secret = this.totpService.generateSecret();
    const otpauthUrl = this.totpService.keyuri(user.email, secret);
    const qrDataUrl = await this.totpService.qrDataUrl(otpauthUrl);
    const token = this.tokenService.signShortLived(
      { sub: user.id, accountId: user.accountId, purpose: '2fa-setup', secret },
      '10m',
    );
    return {
      accessToken: '',
      refreshToken: '',
      twoFactor: { mode: 'setup', token, otpauthUrl, qrDataUrl, secret },
    };
  }

  /**
   * Finish login by validating the OTP code against the challenge token.
   * For 'setup' the pending secret is persisted on the first successful code.
   */
  async complete2fa(
    token: string,
    code: string,
    userAgent = '',
    ipAddress = '',
  ): Promise<AuthResponseDto> {
    let payload: { sub: number; accountId: number; purpose: string; secret?: string };
    try {
      payload = this.tokenService.verifyShortLived(token);
    } catch {
      throw new UnauthorizedException('Сессия подтверждения истекла — войдите снова');
    }
    if (!payload || (payload.purpose !== '2fa-verify' && payload.purpose !== '2fa-setup')) {
      throw new UnauthorizedException('Недействительный токен подтверждения');
    }

    const otpThrottleId = `otp:${payload.sub}`;
    await this.throttle.assertNotLocked(otpThrottleId);

    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException('Пользователь не найден');

    const secret =
      payload.purpose === '2fa-setup'
        ? payload.secret
        : (user.settings as any)?.twoFactor?.secret;
    if (!secret) throw new UnauthorizedException('Двухфакторная аутентификация не настроена');

    if (!this.totpService.verify(code, secret)) {
      await this.throttle.recordFailure(otpThrottleId);
      throw new UnauthorizedException('Неверный код подтверждения');
    }
    await this.throttle.reset(otpThrottleId);

    if (payload.purpose === '2fa-setup') {
      const newSettings = {
        ...((user.settings as any) || {}),
        twoFactor: { enabled: true, secret, confirmedAt: new Date().toISOString() },
      };
      await this.userRepository.updateSettings(user.id, newSettings);
      (user as any).settings = newSettings;
      this.logger.log(`2FA enrolled for user: ${user.email}`);
    }

    const account = await this.accountRepository.findById(user.accountId);
    return this.issueSession(user, account, userAgent, ipAddress);
  }

  // ── Self-service 2FA management (from the user's profile) ───────────

  /** Whether the current user has 2FA enrolled, and whether the company enforces it. */
  async get2faStatus(userId: number, accountId: number) {
    const user = await this.userRepository.findById(userId);
    const account = await this.accountRepository.findById(accountId);
    return {
      enabled: Boolean((user?.settings as any)?.twoFactor?.enabled),
      required: Boolean((account?.settings as any)?.require_2fa),
    };
  }

  /**
   * Begin self-service enrollment: generate a fresh secret and a short-lived
   * enrollment token that carries it. Nothing is persisted until /2fa/confirm.
   */
  async setup2fa(userId: number, email: string) {
    const secret = this.totpService.generateSecret();
    const otpauthUrl = this.totpService.keyuri(email, secret);
    const qrDataUrl = await this.totpService.qrDataUrl(otpauthUrl);
    const token = this.tokenService.signShortLived(
      { sub: userId, purpose: '2fa-enroll', secret },
      '10m',
    );
    return { token, otpauthUrl, qrDataUrl, secret };
  }

  /** Confirm self-service enrollment by validating a code against the enrollment token. */
  async confirm2fa(userId: number, token: string, code: string): Promise<MessageResponseDto> {
    let payload: { sub: number; purpose: string; secret?: string };
    try {
      payload = this.tokenService.verifyShortLived(token);
    } catch {
      throw new BadRequestException('Сессия настройки истекла — начните заново');
    }
    if (!payload || payload.purpose !== '2fa-enroll' || payload.sub !== userId || !payload.secret) {
      throw new BadRequestException('Недействительный токен настройки');
    }
    if (!this.totpService.verify(code, payload.secret)) {
      throw new BadRequestException('Неверный код подтверждения');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('Пользователь не найден');
    const newSettings = {
      ...((user.settings as any) || {}),
      twoFactor: { enabled: true, secret: payload.secret, confirmedAt: new Date().toISOString() },
    };
    await this.userRepository.updateSettings(userId, newSettings);
    this.logger.log(`2FA enabled (self-service) for user: ${user.email}`);
    return { message: 'Двухфакторная аутентификация включена' };
  }

  /** Disable 2FA for the current user (blocked while the company enforces it). */
  async disable2fa(userId: number, accountId: number, code: string): Promise<MessageResponseDto> {
    const account = await this.accountRepository.findById(accountId);
    if ((account?.settings as any)?.require_2fa) {
      throw new BadRequestException(
        'Двухфакторная аутентификация обязательна в вашей компании и не может быть отключена',
      );
    }

    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('Пользователь не найден');

    const tf = (user.settings as any)?.twoFactor;
    if (!tf?.enabled || !tf?.secret) {
      throw new BadRequestException('Двухфакторная аутентификация не включена');
    }
    if (!this.totpService.verify(code, tf.secret)) {
      throw new BadRequestException('Неверный код подтверждения');
    }

    const newSettings = { ...((user.settings as any) || {}) };
    delete newSettings.twoFactor;
    await this.userRepository.updateSettings(userId, newSettings);
    this.logger.log(`2FA disabled (self-service) for user: ${user.email}`);
    return { message: 'Двухфакторная аутентификация отключена' };
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

        // Грейс-период: на ≈60с запоминаем связку старый→новый токен, чтобы
        // опоздавшая вкладка со «старым» токеном не получила 401 → разлогин.
        await this.sessionBlacklist.rememberRotation(
          refreshTokenDto.refreshToken,
          tokenPair.refreshToken,
          session.id,
        );

        const accessToken = this.tokenService.generateAccessToken({
          ...jwtPayload,
          sid: session.id,
        });

        return { accessToken, refreshToken: tokenPair.refreshToken };
      }

      // Гонка вкладок: токен уже ротирован другим запросом секунду назад.
      // Отдаём актуальную пару из грейс-окна вместо разлогина.
      const rotated = await this.sessionBlacklist.getRotatedPair(
        refreshTokenDto.refreshToken,
      );
      if (rotated) {
        const accessToken = this.tokenService.generateAccessToken({
          ...jwtPayload,
          sid: rotated.sessionId,
        });
        return { accessToken, refreshToken: rotated.newToken };
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
      // Blacklist so the still-valid access token is rejected at the gateway
      // immediately, instead of living until exp (~15m).
      await this.sessionBlacklist.revoke(sessionId, 900);
    }
    await this.userRepository.updateRefreshToken(userId, null, null);
    this.logger.log(`User logged out: ${userId}`);
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: number): Promise<MessageResponseDto> {
    // Snapshot session ids before deleting so each access token can be
    // blacklisted (instant invalidation across all the user's devices).
    const sessions = await this.sessionRepository.findAllByUserId(userId);
    await this.sessionRepository.deleteAllByUserId(userId);
    await this.userRepository.clearAllRefreshTokens(userId);
    await Promise.all(
      sessions.map((s: { id: number }) =>
        this.sessionBlacklist.revoke(s.id, 900),
      ),
    );
    this.logger.log(`All sessions cleared for user: ${userId}`);
    return { message: 'All sessions terminated successfully' };
  }

  async getSessions(userId: number, currentSessionId?: number) {
    // Сессии с истёкшим refresh-токеном уже не активны — убираем из списка
    await this.sessionRepository.deleteExpired(userId);
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
    // accountName/logo нужны фронту на инициализации (при httpOnly он больше не
    // достаёт их из JWT — токен недоступен JS).
    const account = await this.accountRepository.findById(user.accountId);
    return {
      ...this.mapUserToResponse(user),
      accountName: account?.name ?? undefined,
      accountLogoUrl: (account?.settings as any)?.logoUrl ?? undefined,
    };
  }

  // ── Registration Requests ──────────────────────────────────────────

  async createRegistrationRequest(dto: CreateRegistrationRequestDto): Promise<MessageResponseDto> {
    const emailLower = dto.email.trim().toLowerCase();
    let accountId = dto.accountId ?? 1;

    if (dto.memberInviteToken) {
      const invite = await this.memberInviteRepository.findByToken(dto.memberInviteToken);
      if (!invite) throw new BadRequestException('Инвайт-ссылка недействительна');
      if (invite.usedAt) throw new BadRequestException('Инвайт-ссылка уже была использована');
      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        throw new BadRequestException('Срок действия инвайт-ссылки истёк');
      }
      accountId = invite.accountId;
    }

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

    const request = await this.registrationRequestRepository.create({
      name: dto.name,
      email: emailLower,
      phone: dto.phone || null,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
      passwordDigest,
      status: 0,
      accountId,
    });

    if (dto.memberInviteToken) {
      await this.memberInviteRepository.markUsed(dto.memberInviteToken);
    }

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

    // Guard: check only within the same account — same email in other companies is allowed
    const activeUser = await this.userRepository.findByEmailAndAccount(request.email, request.accountId);
    if (activeUser) {
      throw new ConflictException(
        `Пользователь с email ${request.email} уже зарегистрирован в этой компании. Отклоните заявку.`,
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

  // ── Member Invite management (Admin/HR scoped) ─────────────────────────────

  async createMemberInvite(accountId: number, userId: number, dto: CreateMemberInviteDto) {
    const expiresInHours = dto.expiresInHours ?? 72;
    const expiresAt = expiresInHours > 0
      ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
      : null;
    return this.memberInviteRepository.create({
      accountId,
      createdByUserId: userId,
      note: dto.note,
      expiresAt,
    });
  }

  async listMemberInvites(accountId: number) {
    return this.memberInviteRepository.findAllByAccount(accountId);
  }

  async revokeMemberInvite(token: string, accountId: number): Promise<MessageResponseDto> {
    await this.memberInviteRepository.deleteByTokenAndAccount(token, accountId);
    return { message: 'Инвайт отозван' };
  }

  async checkMemberInvite(token: string) {
    const invite = await this.memberInviteRepository.findByToken(token);
    if (!invite) return { valid: false, reason: 'not_found' };
    if (invite.usedAt) return { valid: false, reason: 'used' };
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return { valid: false, reason: 'expired' };
    }
    return {
      valid: true,
      companyName: invite.companyName,
      accountId: invite.accountId,
      expiresAt: invite.expiresAt,
      note: invite.note,
    };
  }

  async getMyAccounts(email: string) {
    const allUsers = await this.userRepository.findAllByEmail(email);
    return allUsers
      .filter((u) => u.isActive)
      .map((u) => ({
        id: u.account.id,
        name: u.account.name,
        logoUrl: (u.account.settings as any)?.logoUrl ?? undefined,
      }));
  }

  async switchAccount(
    email: string,
    targetAccountId: number,
    userAgent = '',
    ipAddress = '',
  ): Promise<AuthResponseDto> {
    const allUsers = await this.userRepository.findAllByEmail(email);
    const targetUser = allUsers.find((u) => u.accountId === targetAccountId && u.isActive);
    if (!targetUser) throw new UnauthorizedException('Account not found or inactive');

    const account = await this.accountRepository.findById(targetAccountId);
    const isGlobalAdmin = (targetUser.settings as any)?.isGlobalAdmin === true;

    const jwtPayload: JwtPayload = {
      sub: targetUser.id,
      email: targetUser.email,
      roleId: targetUser.roleId,
      accountId: targetUser.accountId,
      accountName: account?.name,
      accountLogoUrl: account?.settings?.logoUrl ?? undefined,
      isGlobalAdmin: isGlobalAdmin || undefined,
    };

    const tokenPair = this.tokenService.generateTokenPair(jwtPayload);
    await this.sessionRepository.deleteByDevice(targetUser.id, userAgent, ipAddress);
    await this.sessionRepository.enforceLimit(targetUser.id, 5);
    const session = await this.sessionRepository.create({
      userId: targetUser.id,
      refreshToken: tokenPair.refreshToken,
      expiresAt: tokenPair.refreshTokenExpiresAt,
      userAgent: userAgent || undefined,
      ipAddress: ipAddress || undefined,
    });

    await this.userRepository.updateRefreshToken(
      targetUser.id,
      tokenPair.refreshToken,
      tokenPair.refreshTokenExpiresAt,
    );

    const accessToken = this.tokenService.generateAccessToken({
      ...jwtPayload,
      sid: session.id,
    });

    await this.userRepository.updateSignInInfo(targetUser.id);

    this.logger.log(`User switched to account ${targetAccountId}: ${email}`);

    return {
      accessToken,
      refreshToken: tokenPair.refreshToken,
      sessionId: session.id,
      user: this.mapUserToResponse(targetUser),
    };
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

  async updateAccount(id: number, data: { status?: number; name?: string; subdomain?: string }) {
    return this.accountRepository.update(id, data);
  }

  // ── Password reset / account recovery via email ─────────────────────

  private hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Step 1: request recovery. Always returns the same generic message
   * regardless of whether the email exists (no account enumeration).
   * One token covers all accounts tied to the email (client / admin / multiple companies).
   */
  async requestPasswordReset(email: string, ipAddress = ''): Promise<MessageResponseDto> {
    const emailLower = email.trim().toLowerCase();
    const generic: MessageResponseDto = {
      message:
        'Если аккаунт с таким email существует, на него отправлено письмо с инструкциями по восстановлению.',
    };

    const users = await this.userRepository.findAllByEmail(emailLower);
    const active = users.filter((u: any) => u.isActive);
    if (active.length === 0) {
      this.logger.log(`Password reset requested for unknown/inactive email: ${emailLower}`);
      return generic;
    }

    // Invalidate any still-active tokens before issuing a fresh one.
    await this.passwordResetRepository.invalidateAllForEmail(emailLower);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresMinutes =
      this.configService.get<number>('passwordReset.expiresMinutes') || 60;
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    await this.passwordResetRepository.create({
      email: emailLower,
      tokenHash,
      expiresAt,
      ipAddress: ipAddress || undefined,
    });

    const frontendUrl =
      this.configService.get<string>('frontendUrl') || 'http://localhost:3001';
    const resetUrl = `${frontendUrl.replace(/\/$/, '')}/auth/reset-password?token=${rawToken}`;

    // Send off the request thread via BullMQ so the response is instant and the
    // SMTP send is retried on transient failures. If the queue itself is
    // unavailable (Redis down), fall back to sending inline so recovery still works.
    const mailJob: PasswordResetMailJob = {
      to: emailLower,
      resetUrl,
      accountsCount: active.length,
      expiresMinutes,
    };
    try {
      await this.mailQueue.add(MAIL_JOB_PASSWORD_RESET, mailJob);
    } catch (err) {
      this.logger.warn(
        `Mail queue unavailable, sending inline: ${(err as Error).message}`,
      );
      await this.mailService.sendPasswordReset(
        mailJob.to,
        mailJob.resetUrl,
        mailJob.accountsCount,
        mailJob.expiresMinutes,
      );
    }

    this.logger.log(`Password reset requested: ${emailLower} (${active.length} account(s))`);
    return generic;
  }

  /**
   * Step 2: validate a reset token and return the list of accounts the user
   * may recover (so they can choose: client portal / admin / different companies).
   */
  async getResetTokenAccounts(rawToken: string) {
    const token = await this.passwordResetRepository.findValidByHash(this.hashToken(rawToken));
    if (!token) {
      throw new BadRequestException('Ссылка недействительна или срок её действия истёк');
    }
    const users = await this.userRepository.findAllByEmailWithRole(token.email);
    const active = users.filter((u: any) => u.isActive);
    return {
      email: token.email,
      accounts: active.map((u: any) => ({
        userId: u.id,
        accountId: u.accountId,
        companyName: u.account?.name ?? `Компания #${u.accountId}`,
        roleId: u.roleId ?? null,
        roleName: u.role?.name ?? null,
        isClientPortal: u.roleId === 15,
      })),
    };
  }

  /**
   * Step 3: confirm recovery. Resets the password for the selected accounts,
   * revokes their sessions and writes an audit record per account.
   */
  async confirmPasswordReset(
    rawToken: string,
    userIds: number[],
    password: string,
    ipAddress = '',
    userAgent = '',
  ): Promise<MessageResponseDto> {
    const token = await this.passwordResetRepository.findValidByHash(this.hashToken(rawToken));
    if (!token) {
      throw new BadRequestException('Ссылка недействительна или срок её действия истёк');
    }

    const users = await this.userRepository.findAllByEmailWithRole(token.email);
    const active = users.filter((u: any) => u.isActive);
    const selected = active.filter((u: any) => userIds.includes(u.id));
    if (selected.length === 0) {
      throw new BadRequestException('Не выбран ни один аккаунт для восстановления');
    }

    const digest = await this.passwordService.hash(password);

    for (const u of selected) {
      await this.userRepository.updatePassword(u.id, digest);
      await this.sessionRepository.deleteAllByUserId(u.id);
      await this.recoveryLogRepository.create({
        accountId: u.accountId,
        userId: u.id,
        email: u.email,
        userName: u.name ?? null,
        roleId: u.roleId ?? null,
        accountName: u.account?.name ?? null,
        method: 'email',
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      });
    }

    await this.passwordResetRepository.markUsed(token.id);
    this.logger.log(
      `Password reset confirmed: ${token.email} for ${selected.length} account(s)`,
    );

    return {
      message: `Пароль обновлён для выбранных аккаунтов (${selected.length}). Теперь вы можете войти.`,
    };
  }

  /** Recovery audit log for the current company (admins only). */
  async getRecoveryLog(accountId: number) {
    const rows = await this.recoveryLogRepository.findByAccount(accountId, 200);
    return rows.map((r: any) => ({
      id: r.id,
      userId: r.userId,
      email: r.email,
      userName: r.userName,
      roleId: r.roleId,
      accountName: r.accountName,
      method: r.method ?? 'email',
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      recoveredAt: r.recoveredAt,
    }));
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
      mustChangePassword: user.mustChangePassword || undefined,
    };
  }
}
