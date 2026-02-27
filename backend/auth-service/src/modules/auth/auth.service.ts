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
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly accountRepository: AccountRepository,
    private readonly registrationRequestRepository: RegistrationRequestRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(
      registerDto.email,
    );
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Verify account exists and is active
    const account = await this.accountRepository.findById(
      registerDto.accountId,
    );
    if (!account) {
      throw new NotFoundException('Account not found or inactive');
    }

    // Verify role exists
    const role = await this.roleRepository.findById(registerDto.roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Hash password
    const passwordDigest = await this.passwordService.hash(
      registerDto.password,
    );

    // Create user
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

    // Generate tokens
    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      accountId: user.accountId,
    };

    const tokenPair = this.tokenService.generateTokenPair(jwtPayload);

    // Store refresh token hash in database
    await this.userRepository.updateRefreshToken(
      user.id,
      tokenPair.refreshToken,
      tokenPair.refreshTokenExpiresAt,
    );

    this.logger.log(`User registered: ${user.email}`);

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      user: this.mapUserToResponse(user),
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // Find user by email
    const user = await this.userRepository.findByEmail(loginDto.email);
    if (!user) {
      // Check registration requests
      const regRequest =
        await this.registrationRequestRepository.findByEmail(loginDto.email);
      if (regRequest) {
        if (regRequest.status === 0) {
          throw new UnauthorizedException(
            'Ваша заявка на регистрацию ещё не рассмотрена',
          );
        }
        if (regRequest.status === 2) {
          const reason = regRequest.rejectReason
            ? `: ${regRequest.rejectReason}`
            : '';
          throw new UnauthorizedException(
            `Ваша заявка отклонена${reason}`,
          );
        }
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Verify password
    if (!user.passwordDigest) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.compare(
      loginDto.password,
      user.passwordDigest,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update sign-in info
    await this.userRepository.updateSignInInfo(user.id);

    // Generate tokens
    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      accountId: user.accountId,
    };

    const tokenPair = this.tokenService.generateTokenPair(jwtPayload);

    // Store refresh token in database
    await this.userRepository.updateRefreshToken(
      user.id,
      tokenPair.refreshToken,
      tokenPair.refreshTokenExpiresAt,
    );

    this.logger.log(`User logged in: ${user.email}`);

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      user: this.mapUserToResponse(user),
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<TokenResponseDto> {
    try {
      // Verify the refresh token
      const payload = this.tokenService.verifyRefreshToken(
        refreshTokenDto.refreshToken,
      );

      // Find user and verify refresh token matches
      const user = await this.userRepository.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User account is inactive');
      }

      // Check if refresh token matches stored token
      if (user.refreshToken !== refreshTokenDto.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if refresh token is expired
      if (
        user.refreshTokenExpiresAt &&
        new Date() > user.refreshTokenExpiresAt
      ) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // Generate new tokens
      const jwtPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        roleId: user.roleId,
        accountId: user.accountId,
      };

      const tokenPair = this.tokenService.generateTokenPair(jwtPayload);

      // Update refresh token in database
      await this.userRepository.updateRefreshToken(
        user.id,
        tokenPair.refreshToken,
        tokenPair.refreshTokenExpiresAt,
      );

      this.logger.log(`Tokens refreshed for user: ${user.email}`);

      return {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: number): Promise<MessageResponseDto> {
    await this.userRepository.updateRefreshToken(userId, null, null);
    this.logger.log(`User logged out: ${userId}`);
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: number): Promise<MessageResponseDto> {
    await this.userRepository.clearAllRefreshTokens(userId);
    this.logger.log(`All sessions cleared for user: ${userId}`);
    return { message: 'All sessions terminated successfully' };
  }

  async getMe(userId: number): Promise<UserResponseDto> {
    const user = await this.userRepository.findByIdWithRole(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.mapUserToResponse(user);
  }

  // ── Registration Requests ──────────────────────────────────────────

  async createRegistrationRequest(
    dto: CreateRegistrationRequestDto,
  ): Promise<MessageResponseDto> {
    // Check if email already taken by a user
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    // Check if there is already a pending request
    const pendingRequest =
      await this.registrationRequestRepository.findPendingByEmail(dto.email);
    if (pendingRequest) {
      throw new ConflictException(
        'Заявка с таким email уже подана и ожидает рассмотрения',
      );
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
    if (!request) {
      throw new NotFoundException('Заявка не найдена');
    }
    if (request.status !== 0) {
      throw new BadRequestException('Заявка уже рассмотрена');
    }

    // Verify role exists
    const role = await this.roleRepository.findById(dto.roleId);
    if (!role) {
      throw new NotFoundException('Роль не найдена');
    }

    // Create user
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

    // Update request status
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
    if (!request) {
      throw new NotFoundException('Заявка не найдена');
    }
    if (request.status !== 0) {
      throw new BadRequestException('Заявка уже рассмотрена');
    }

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
