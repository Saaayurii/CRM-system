import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProxyService } from '../../common/services/proxy.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Account or role not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() body: unknown) {
    return this.proxyService.forward('auth', {
      method: 'POST',
      path: '/auth/register',
      data: body,
    });
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() body: unknown) {
    return this.proxyService.forward('auth', {
      method: 'POST',
      path: '/auth/login',
      data: body,
    });
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
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
  @ApiResponse({
    status: 200,
    description: 'All sessions terminated successfully',
  })
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

  // ── Registration Requests ──────────────────────────────────────────

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
}
