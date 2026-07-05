import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ProxyService } from '../../common/services/proxy.service';
import { Public } from '../../common/decorators/public.decorator';
import { AnyRole } from '../../common/decorators/roles.decorator';

// Strict rate limit for auth endpoints: 10 requests per minute per IP
const AUTH_THROTTLE = { default: { ttl: 60_000, limit: 10 } };

const ACCESS_COOKIE = 'crm_at';
const REFRESH_COOKIE = 'crm_rt';
// Читаемый JS хинт со сроком жизни access-токена (сам токен в httpOnly —
// недоступен JS). По нему клиент проактивно обновляет сессию для SSE.
const ACCESS_EXP_COOKIE = 'crm_at_exp';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней (= срок refresh)

interface TokenBody {
  accessToken?: string;
  refreshToken?: string;
}

@ApiTags('Authentication')
@AnyRole()
@Controller('api/v1/auth')
export class AuthGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  /** Достать значение cookie из заголовка Cookie (cookie-parser не подключён). */
  private readCookie(req: Request, name: string): string | null {
    const raw = req.headers.cookie;
    if (!raw) return null;
    const m = raw.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  private decodeExp(token: string): number | null {
    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString('utf8'),
      );
      return typeof payload.exp === 'number' ? payload.exp : null;
    } catch {
      return null;
    }
  }

  /**
   * Ставит httpOnly-cookie с токенами на ответ шлюза (только шлюз терминирует
   * соединение с браузером). Вызывается для всех ответов, где есть пара токенов;
   * ответы без токенов (выбор компании, 2FA-челлендж) пропускаются.
   */
  private setAuthCookies(res: Response, body: TokenBody): void {
    if (!body?.accessToken || !body?.refreshToken) return;
    const isProd = process.env.NODE_ENV === 'production';
    const domain = process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;
    const base = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      domain,
      path: '/',
      maxAge: COOKIE_MAX_AGE_MS,
    };
    res.cookie(ACCESS_COOKIE, body.accessToken, base);
    res.cookie(REFRESH_COOKIE, body.refreshToken, base);

    const exp = this.decodeExp(body.accessToken);
    if (exp) {
      // Хинт читаемый (httpOnly:false) — это лишь timestamp, не секрет.
      res.cookie(ACCESS_EXP_COOKIE, String(exp), { ...base, httpOnly: false });
    }
  }

  private clearAuthCookies(res: Response): void {
    const domain = process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;
    const opts = { domain, path: '/' };
    res.clearCookie(ACCESS_COOKIE, opts);
    res.clearCookie(REFRESH_COOKIE, opts);
    res.clearCookie(ACCESS_EXP_COOKIE, opts);
  }

  @Post('register')
  @Public()
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Account or role not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(
    @Body() body: unknown,
    @Headers('user-agent') userAgent: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.proxyService.forward<TokenBody>('auth', {
      method: 'POST',
      path: '/auth/register',
      data: body,
      headers: {
        'X-User-Agent': userAgent || '',
        'X-Real-IP': req.ip || '',
      },
    });
    this.setAuthCookies(res, result);
    return result;
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() body: unknown,
    @Headers('user-agent') userAgent: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.proxyService.forward<TokenBody>('auth', {
      method: 'POST',
      path: '/auth/login',
      data: body,
      headers: {
        'X-User-Agent': userAgent || '',
        'X-Real-IP': req.ip || '',
      },
    });
    this.setAuthCookies(res, result);
    return result;
  }

  @Post('2fa/login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Complete login by confirming a 2FA OTP code' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid or expired code/token' })
  async twoFactorLogin(
    @Body() body: unknown,
    @Headers('user-agent') userAgent: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.proxyService.forward<TokenBody>('auth', {
      method: 'POST',
      path: '/auth/2fa/login',
      data: body,
      headers: {
        'X-User-Agent': userAgent || '',
        'X-Real-IP': req.ip || '',
      },
    });
    this.setAuthCookies(res, result);
    return result;
  }

  // ── Password reset / account recovery via email ──────────────────────────

  @Post('password-reset/request')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Request a password-reset email' })
  async requestPasswordReset(
    @Body() body: unknown,
    @Headers('user-agent') userAgent: string,
    @Req() req: any,
  ) {
    return this.proxyService.forward('auth', {
      method: 'POST',
      path: '/auth/password-reset/request',
      data: body,
      headers: {
        'X-User-Agent': userAgent || '',
        'X-Real-IP': req.ip || '',
      },
    });
  }

  @Get('password-reset/accounts')
  @Public()
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'List accounts recoverable with a reset token' })
  async getResetTokenAccounts(@Query('token') token: string) {
    return this.proxyService.forward('auth', {
      method: 'GET',
      path: `/auth/password-reset/accounts?token=${encodeURIComponent(token || '')}`,
      headers: {},
    });
  }

  @Post('password-reset/confirm')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Confirm recovery and set a new password' })
  async confirmPasswordReset(
    @Body() body: unknown,
    @Headers('user-agent') userAgent: string,
    @Req() req: any,
  ) {
    return this.proxyService.forward('auth', {
      method: 'POST',
      path: '/auth/password-reset/confirm',
      data: body,
      headers: {
        'X-User-Agent': userAgent || '',
        'X-Real-IP': req.ip || '',
      },
    });
  }

  @Get('account-recovery-log')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Account recovery audit log for current company (Admin)' })
  async getRecoveryLog(@Headers('authorization') authorization: string) {
    return this.proxyService.forward('auth', {
      method: 'GET',
      path: '/auth/account-recovery-log',
      headers: { Authorization: authorization },
    });
  }

  @Get('2fa/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user 2FA status' })
  async get2faStatus(@Headers('authorization') authorization: string) {
    return this.proxyService.forward('auth', {
      method: 'GET',
      path: '/auth/2fa/status',
      headers: { Authorization: authorization },
    });
  }

  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Begin 2FA enrollment — returns QR and enrollment token' })
  async setup2fa(@Headers('authorization') authorization: string) {
    return this.proxyService.forward('auth', {
      method: 'POST',
      path: '/auth/2fa/setup',
      headers: { Authorization: authorization },
    });
  }

  @Post('2fa/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm 2FA enrollment with an OTP code' })
  async confirm2fa(@Body() body: unknown, @Headers('authorization') authorization: string) {
    return this.proxyService.forward('auth', {
      method: 'POST',
      path: '/auth/2fa/confirm',
      data: body,
      headers: { Authorization: authorization, 'content-type': 'application/json' },
    });
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA for the current user' })
  async disable2fa(@Body() body: unknown, @Headers('authorization') authorization: string) {
    return this.proxyService.forward('auth', {
      method: 'POST',
      path: '/auth/2fa/disable',
      data: body,
      headers: { Authorization: authorization, 'content-type': 'application/json' },
    });
  }

  @Post('portal/login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Client portal login (login + password)' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async portalLogin(
    @Body() body: unknown,
    @Headers('user-agent') userAgent: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.proxyService.forward<TokenBody>('auth', {
      method: 'POST',
      path: '/auth/portal/login',
      data: body,
      headers: {
        'X-User-Agent': userAgent || '',
        'X-Real-IP': req.ip || '',
      },
    });
    this.setAuthCookies(res, result);
    return result;
  }

  @Post('portal/magic')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Client portal login (magic link token)' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async portalMagic(
    @Body() body: unknown,
    @Headers('user-agent') userAgent: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.proxyService.forward<TokenBody>('auth', {
      method: 'POST',
      path: '/auth/portal/magic',
      data: body,
      headers: {
        'X-User-Agent': userAgent || '',
        'X-Real-IP': req.ip || '',
      },
    });
    this.setAuthCookies(res, result);
    return result;
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Body() body: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Refresh-токен теперь в httpOnly-cookie; тело оставлено для обратной
    // совместимости (старый клиент/мобильное приложение).
    const refreshToken = body?.refreshToken || this.readCookie(req, REFRESH_COOKIE);
    const result = await this.proxyService.forward<TokenBody>('auth', {
      method: 'POST',
      path: '/auth/refresh',
      data: { refreshToken },
    });
    this.setAuthCookies(res, result);
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @Headers('authorization') authorization: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.proxyService.forward('auth', {
      method: 'POST',
      path: '/auth/logout',
      headers: { Authorization: authorization },
    });
    this.clearAuthCookies(res);
    return result;
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout all sessions' })
  @ApiResponse({ status: 200, description: 'All sessions terminated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logoutAll(
    @Headers('authorization') authorization: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.proxyService.forward('auth', {
      method: 'POST',
      path: '/auth/logout-all',
      headers: { Authorization: authorization },
    });
    this.clearAuthCookies(res);
    return result;
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getMe(@Headers('authorization') authorization: string) {
    return this.proxyService.forward('auth', {
      method: 'GET',
      path: '/auth/me',
      headers: { Authorization: authorization },
    });
  }

  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active sessions for current user' })
  @ApiResponse({ status: 200, description: 'List of active sessions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSessions(@Headers('authorization') authorization: string) {
    return this.proxyService.forward('auth', {
      method: 'GET',
      path: '/auth/sessions',
      headers: { Authorization: authorization },
    });
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({ status: 200, description: 'Session revoked' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async revokeSession(
    @Param('id') id: string,
    @Headers('authorization') authorization: string,
  ) {
    return this.proxyService.forward('auth', {
      method: 'DELETE',
      path: `/auth/sessions/${id}`,
      headers: { Authorization: authorization },
    });
  }

  @Post('registration-requests')
  @Public()
  @ApiOperation({ summary: 'Submit a registration request' })
  @ApiResponse({ status: 201, description: 'Request created' })
  async createRegistrationRequest(@Body() body: unknown) {
    return this.proxyService.forward('auth', {
      method: 'POST',
      path: '/auth/registration-requests',
      data: body,
    });
  }

  @Get('registration-requests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get registration requests (Admin/HR)' })
  @ApiResponse({ status: 200, description: 'List of requests' })
  async getRegistrationRequests(
    @Headers('authorization') authorization: string,
    @Query('status') status?: string,
  ) {
    const query = status !== undefined ? `?status=${status}` : '';
    return this.proxyService.forward('auth', {
      method: 'GET',
      path: `/auth/registration-requests${query}`,
      headers: { Authorization: authorization },
    });
  }

  @Put('registration-requests/:id/approve')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve registration request (Admin/HR)' })
  @ApiResponse({ status: 200, description: 'Request approved' })
  async approveRegistrationRequest(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
  ) {
    return this.proxyService.forward('auth', {
      method: 'PUT',
      path: `/auth/registration-requests/${id}/approve`,
      data: body,
      headers: { Authorization: authorization },
    });
  }

  @Put('registration-requests/:id/reject')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject registration request (Admin/HR)' })
  @ApiResponse({ status: 200, description: 'Request rejected' })
  async rejectRegistrationRequest(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
  ) {
    return this.proxyService.forward('auth', {
      method: 'PUT',
      path: `/auth/registration-requests/${id}/reject`,
      data: body,
      headers: { Authorization: authorization },
    });
  }

  @Post('register-company')
  @Public()
  @ApiOperation({ summary: 'Register a new company with admin user' })
  async registerCompany(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.proxyService.forward<TokenBody>('auth', {
      method: 'POST',
      path: '/auth/register-company',
      data: body,
      headers: { 'content-type': 'application/json' },
    });
    this.setAuthCookies(res, result);
    return result;
  }

  // ── Multi-company account switching ────────────────────────────────

  @Get('my-accounts')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all accounts available for the current user email' })
  @ApiResponse({ status: 200, description: 'List of accessible accounts' })
  async getMyAccounts(@Headers('authorization') authorization: string) {
    return this.proxyService.forward('auth', {
      method: 'GET',
      path: '/auth/my-accounts',
      headers: { Authorization: authorization },
    });
  }

  @Post('switch-account')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Switch to a different account (same email)' })
  @ApiResponse({ status: 200, description: 'Tokens for the target account' })
  @ApiResponse({ status: 401, description: 'Account not found or inactive' })
  async switchAccount(
    @Body() body: unknown,
    @Headers('authorization') authorization: string,
    @Headers('user-agent') userAgent: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.proxyService.forward<TokenBody>('auth', {
      method: 'POST',
      path: '/auth/switch-account',
      data: body,
      headers: {
        Authorization: authorization,
        'X-User-Agent': userAgent || '',
        'X-Real-IP': req.ip || '',
      },
    });
    this.setAuthCookies(res, result);
    return result;
  }

  // ── Company Invites ──────────────────────────────────────────────────────

  @Post('invites')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create company invite (Super Admin only)' })
  async createInvite(@Body() body: unknown, @Req() req: any) {
    return this.proxyService.forward('auth', {
      method: 'POST',
      path: '/auth/invites',
      data: body,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
    });
  }

  @Get('invites')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List company invites (Super Admin only)' })
  async listInvites(@Req() req: any) {
    return this.proxyService.forward('auth', {
      method: 'GET',
      path: '/auth/invites',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Delete('invites/:token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke company invite (Super Admin only)' })
  async revokeInvite(@Param('token') token: string, @Req() req: any) {
    return this.proxyService.forward('auth', {
      method: 'DELETE',
      path: `/auth/invites/${token}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get('invites/:token/check')
  @Public()
  @ApiOperation({ summary: 'Validate an invite token (public)' })
  async checkInvite(@Param('token') token: string) {
    return this.proxyService.forward('auth', {
      method: 'GET',
      path: `/auth/invites/${token}/check`,
      headers: {},
    });
  }

  // ── Member Invites (Admin/HR) ────────────────────────────────────────────

  @Post('member-invites')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a member invite (Admin/HR)' })
  async createMemberInvite(@Body() body: unknown, @Req() req: any) {
    return this.proxyService.forward('auth', {
      method: 'POST',
      path: '/auth/member-invites',
      data: body,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
    });
  }

  @Get('member-invites')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List member invites for current account (Admin/HR)' })
  async listMemberInvites(@Req() req: any) {
    return this.proxyService.forward('auth', {
      method: 'GET',
      path: '/auth/member-invites',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Delete('member-invites/:token')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a member invite (Admin/HR)' })
  async revokeMemberInvite(@Param('token') token: string, @Req() req: any) {
    return this.proxyService.forward('auth', {
      method: 'DELETE',
      path: `/auth/member-invites/${token}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get('member-invites/:token/check')
  @Public()
  @ApiOperation({ summary: 'Validate a member invite token (public)' })
  async checkMemberInvite(@Param('token') token: string) {
    return this.proxyService.forward('auth', {
      method: 'GET',
      path: `/auth/member-invites/${token}/check`,
      headers: {},
    });
  }
}
