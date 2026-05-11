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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ProxyService } from '../../common/services/proxy.service';
import { Public } from '../../common/decorators/public.decorator';

// Strict rate limit for auth endpoints: 10 requests per minute per IP
const AUTH_THROTTLE = { default: { ttl: 60_000, limit: 10 } };

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

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
  ) {
    return this.proxyService.forward('auth', {
      method: 'POST',
      path: '/auth/register',
      data: body,
      headers: {
        'X-User-Agent': userAgent || '',
        'X-Real-IP': req.ip || '',
      },
    });
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
  ) {
    return this.proxyService.forward('auth', {
      method: 'POST',
      path: '/auth/login',
      data: body,
      headers: {
        'X-User-Agent': userAgent || '',
        'X-Real-IP': req.ip || '',
      },
    });
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() body: unknown) {
    return this.proxyService.forward('auth', {
      method: 'POST',
      path: '/auth/refresh',
      data: body,
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Headers('authorization') authorization: string) {
    return this.proxyService.forward('auth', {
      method: 'POST',
      path: '/auth/logout',
      headers: { Authorization: authorization },
    });
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout all sessions' })
  @ApiResponse({ status: 200, description: 'All sessions terminated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logoutAll(@Headers('authorization') authorization: string) {
    return this.proxyService.forward('auth', {
      method: 'POST',
      path: '/auth/logout-all',
      headers: { Authorization: authorization },
    });
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
  async registerCompany(@Body() body: unknown) {
    return this.proxyService.forward('auth', {
      method: 'POST',
      path: '/auth/register-company',
      data: body,
      headers: { 'content-type': 'application/json' },
    });
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
}
