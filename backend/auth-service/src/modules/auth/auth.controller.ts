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
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { CreateMemberInviteDto } from './dto/create-member-invite.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CreateRegistrationRequestDto } from './dto/create-registration-request.dto';
import { ApproveRegistrationRequestDto } from './dto/approve-registration-request.dto';
import { RejectRegistrationRequestDto } from './dto/reject-registration-request.dto';
import {
  AuthResponseDto,
  TokenResponseDto,
  MessageResponseDto,
  UserResponseDto,
} from './dto/auth-response.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/** Strip IPv4-mapped IPv6 prefix (::ffff:1.2.3.4 → 1.2.3.4) */
function normalizeIp(ip: string): string {
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

interface UserPayload {
  sub: number;
  email: string;
  roleId: number | null;
  accountId: number;
  sid?: number;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Account or role not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() registerDto: RegisterDto, @Req() req: any): Promise<AuthResponseDto> {
    const userAgent = (req.headers['x-user-agent'] || req.headers['user-agent'] || '') as string;
    const ipAddress = (req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip || '') as string;
    return this.authService.register(registerDto, userAgent, normalizeIp(ipAddress.split(',')[0].trim()));
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto, @Req() req: any): Promise<AuthResponseDto> {
    const userAgent = (req.headers['x-user-agent'] || req.headers['user-agent'] || '') as string;
    const ipAddress = (req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip || '') as string;
    return this.authService.login(loginDto, userAgent, normalizeIp(ipAddress.split(',')[0].trim()));
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully', type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<TokenResponseDto> {
    return this.authService.refresh(refreshTokenDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully', type: MessageResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@CurrentUser() user: UserPayload): Promise<MessageResponseDto> {
    return this.authService.logout(user.sub, user.sid);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout all sessions' })
  @ApiResponse({ status: 200, description: 'All sessions terminated successfully', type: MessageResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logoutAll(@CurrentUser() user: UserPayload): Promise<MessageResponseDto> {
    return this.authService.logoutAll(user.sub);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getMe(@CurrentUser() user: UserPayload): Promise<UserResponseDto> {
    return this.authService.getMe(user.sub);
  }

  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active sessions for current user' })
  @ApiResponse({ status: 200, description: 'List of active sessions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSessions(@CurrentUser() user: UserPayload) {
    return this.authService.getSessions(user.sub, user.sid);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({ status: 200, description: 'Session revoked', type: MessageResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async revokeSession(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserPayload,
  ): Promise<MessageResponseDto> {
    return this.authService.revokeSession(user.sub, id);
  }

  // ── Registration Requests ──────────────────────────────────────────

  @Post('registration-requests')
  @Public()
  @ApiOperation({ summary: 'Submit a registration request' })
  @ApiResponse({ status: 201, description: 'Request created' })
  @ApiResponse({ status: 409, description: 'Email already exists or pending request' })
  async createRegistrationRequest(
    @Body() dto: CreateRegistrationRequestDto,
  ): Promise<MessageResponseDto> {
    return this.authService.createRegistrationRequest(dto);
  }

  @Get('registration-requests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all registration requests (Admin/HR)' })
  @ApiResponse({ status: 200, description: 'List of requests' })
  async getRegistrationRequests(
    @CurrentUser() user: UserPayload,
    @Query('status') status?: string,
  ) {
    this.checkAdminOrHR(user);
    const statusNum = status !== undefined ? Number(status) : undefined;
    return this.authService.getRegistrationRequests(statusNum);
  }

  @Put('registration-requests/:id/approve')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a registration request (Admin/HR)' })
  @ApiResponse({ status: 200, description: 'Request approved' })
  async approveRegistrationRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveRegistrationRequestDto,
    @CurrentUser() user: UserPayload,
  ): Promise<MessageResponseDto> {
    this.checkAdminOrHR(user);
    return this.authService.approveRegistrationRequest(id, dto, user.sub);
  }

  @Put('registration-requests/:id/reject')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a registration request (Admin/HR)' })
  @ApiResponse({ status: 200, description: 'Request rejected' })
  async rejectRegistrationRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectRegistrationRequestDto,
    @CurrentUser() user: UserPayload,
  ): Promise<MessageResponseDto> {
    this.checkAdminOrHR(user);
    return this.authService.rejectRegistrationRequest(id, dto, user.sub);
  }

  // ── Company Registration ───────────────────────────────────────────

  @Post('register-company')
  @Public()
  @ApiOperation({ summary: 'Register a new company with admin user' })
  @ApiResponse({ status: 201, description: 'Company and admin created', type: AuthResponseDto })
  async registerCompany(@Body() dto: RegisterCompanyDto, @Req() req: any): Promise<AuthResponseDto> {
    const userAgent = (req.headers['x-user-agent'] || req.headers['user-agent'] || '') as string;
    const ipAddress = (req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip || '') as string;
    return this.authService.registerCompany(dto, userAgent, normalizeIp(ipAddress.split(',')[0].trim()));
  }

  // ── Accounts (Global Super Admin) ─────────────────────────────────

  @Get('accounts')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all accounts (Global Super Admin only)' })
  async getAccounts(@CurrentUser() user: UserPayload) {
    if (user.roleId !== 1) throw new ForbiddenException('Доступ запрещён');
    return this.authService.getAccounts();
  }

  @Put('accounts/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update account status (Global Super Admin only)' })
  async updateAccount(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status?: number; name?: string },
    @CurrentUser() user: UserPayload,
  ) {
    if (user.roleId !== 1) throw new ForbiddenException('Доступ запрещён');
    return this.authService.updateAccount(id, body);
  }

  // ── Company Invites ────────────────────────────────────────────────────────

  @Post('invites')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a company registration invite (Super Admin only)' })
  async createInvite(
    @Body() dto: CreateInviteDto,
    @CurrentUser() user: UserPayload,
  ) {
    if (user.roleId !== 1) throw new ForbiddenException('Доступ запрещён');
    return this.authService.createInvite(user.sub, dto);
  }

  @Get('invites')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all company invites (Super Admin only)' })
  async listInvites(@CurrentUser() user: UserPayload) {
    if (user.roleId !== 1) throw new ForbiddenException('Доступ запрещён');
    return this.authService.listInvites();
  }

  @Delete('invites/:token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a company invite (Super Admin only)' })
  async revokeInvite(
    @Param('token') token: string,
    @CurrentUser() user: UserPayload,
  ) {
    if (user.roleId !== 1) throw new ForbiddenException('Доступ запрещён');
    return this.authService.revokeInvite(token);
  }

  @Get('invites/:token/check')
  @Public()
  @ApiOperation({ summary: 'Validate an invite token (public)' })
  async checkInvite(@Param('token') token: string) {
    return this.authService.checkInvite(token);
  }

  // ── Member Invites (Admin/HR) ────────────────────────────────────────────

  @Post('member-invites')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a member invite for current account (Admin/HR)' })
  async createMemberInvite(
    @Body() dto: CreateMemberInviteDto,
    @CurrentUser() user: UserPayload,
  ) {
    this.checkAdminOrHR(user);
    return this.authService.createMemberInvite(user.accountId, user.sub, dto);
  }

  @Get('member-invites')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List member invites for current account (Admin/HR)' })
  async listMemberInvites(@CurrentUser() user: UserPayload) {
    this.checkAdminOrHR(user);
    return this.authService.listMemberInvites(user.accountId);
  }

  @Delete('member-invites/:token')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a member invite (Admin/HR)' })
  async revokeMemberInvite(
    @Param('token') token: string,
    @CurrentUser() user: UserPayload,
  ): Promise<MessageResponseDto> {
    this.checkAdminOrHR(user);
    return this.authService.revokeMemberInvite(token, user.accountId);
  }

  @Get('member-invites/:token/check')
  @Public()
  @ApiOperation({ summary: 'Validate a member invite token (public)' })
  async checkMemberInvite(@Param('token') token: string) {
    return this.authService.checkMemberInvite(token);
  }

  private checkAdminOrHR(user: UserPayload) {
    const allowedRoles = [1, 2, 3]; // super_admin, admin, hr_manager
    if (!user.roleId || !allowedRoles.includes(user.roleId)) {
      throw new ForbiddenException('Доступ запрещён');
    }
  }
}
