import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto, UserResponseDto, TokenResponseDto, MessageResponseDto } from './dto/auth-response.dto';
import { UserRepository } from './repositories/user.repository';
import { RoleRepository } from './repositories/role.repository';
import { AccountRepository } from './repositories/account.repository';
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
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Verify account exists and is active
    const account = await this.accountRepository.findById(registerDto.accountId);
    if (!account) {
      throw new NotFoundException('Account not found or inactive');
    }

    // Verify role exists
    const role = await this.roleRepository.findById(registerDto.roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Hash password
    const passwordDigest = await this.passwordService.hash(registerDto.password);

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
      const payload = this.tokenService.verifyRefreshToken(refreshTokenDto.refreshToken);

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
      if (user.refreshTokenExpiresAt && new Date() > user.refreshTokenExpiresAt) {
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
