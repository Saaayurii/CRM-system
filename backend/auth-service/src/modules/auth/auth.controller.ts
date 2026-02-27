import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
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

interface UserPayload {
  sub: number;
  email: string;
  roleId: number | null;
  accountId: number;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Account or role not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    type: TokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<TokenResponseDto> {
    return this.authService.refresh(refreshTokenDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@CurrentUser() user: UserPayload): Promise<MessageResponseDto> {
    return this.authService.logout(user.sub);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout all sessions' })
  @ApiResponse({
    status: 200,
    description: 'All sessions terminated successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logoutAll(
    @CurrentUser() user: UserPayload,
  ): Promise<MessageResponseDto> {
    return this.authService.logoutAll(user.sub);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getMe(@CurrentUser() user: UserPayload): Promise<UserResponseDto> {
    return this.authService.getMe(user.sub);
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

  private checkAdminOrHR(user: UserPayload) {
    const allowedRoles = [1, 2, 3]; // super_admin, admin, hr_manager
    if (!user.roleId || !allowedRoles.includes(user.roleId)) {
      throw new ForbiddenException('Доступ запрещён');
    }
  }
}
