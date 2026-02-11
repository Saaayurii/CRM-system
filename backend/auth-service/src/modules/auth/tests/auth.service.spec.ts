import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { UserRepository } from '../repositories/user.repository';
import { RoleRepository } from '../repositories/role.repository';
import { AccountRepository } from '../repositories/account.repository';
import { PasswordService } from '../services/password.service';
import { TokenService } from '../services/token.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let roleRepository: jest.Mocked<RoleRepository>;
  let accountRepository: jest.Mocked<AccountRepository>;
  let passwordService: jest.Mocked<PasswordService>;
  let tokenService: jest.Mocked<TokenService>;

  const mockUser = {
    id: 1,
    accountId: 1,
    roleId: 1,
    name: 'Test User',
    email: 'test@example.com',
    phone: '+7 999 123 4567',
    avatarUrl: null,
    availability: 1,
    isActive: true,
    passwordDigest: 'hashedPassword',
    confirmedAt: new Date(),
    lastSignInAt: null,
    currentSignInAt: null,
    signInCount: 0,
    refreshToken: 'refreshToken',
    refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    position: 'Developer',
    hireDate: null,
    birthDate: null,
    passportData: null,
    address: null,
    settings: {},
    notificationSettings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockAccount = {
    id: 1,
    name: 'Test Company',
    subdomain: 'test',
    settings: {},
    status: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRole = {
    id: 1,
    name: 'Admin',
    code: 'admin',
    description: 'Administrator',
    permissions: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTokenPair = {
    accessToken: 'accessToken',
    refreshToken: 'refreshToken',
    refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: {
            findById: jest.fn(),
            findByEmail: jest.fn(),
            findByIdWithRole: jest.fn(),
            create: jest.fn(),
            updateRefreshToken: jest.fn(),
            updateSignInInfo: jest.fn(),
            clearAllRefreshTokens: jest.fn(),
          },
        },
        {
          provide: RoleRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: AccountRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: PasswordService,
          useValue: {
            hash: jest.fn(),
            compare: jest.fn(),
          },
        },
        {
          provide: TokenService,
          useValue: {
            generateTokenPair: jest.fn(),
            verifyRefreshToken: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(UserRepository);
    roleRepository = module.get(RoleRepository);
    accountRepository = module.get(AccountRepository);
    passwordService = module.get(PasswordService);
    tokenService = module.get(TokenService);
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      accountId: 1,
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      roleId: 1,
      phone: '+7 999 123 4567',
      position: 'Developer',
    };

    it('should create a new user with hashed password and return tokens', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      accountRepository.findById.mockResolvedValue(mockAccount);
      roleRepository.findById.mockResolvedValue(mockRole);
      passwordService.hash.mockResolvedValue('hashedPassword');
      userRepository.create.mockResolvedValue(mockUser);
      tokenService.generateTokenPair.mockReturnValue(mockTokenPair);
      userRepository.updateRefreshToken.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('accessToken');
      expect(result.refreshToken).toBe('refreshToken');
      expect(result.user.email).toBe(registerDto.email);
      expect(passwordService.hash).toHaveBeenCalledWith(registerDto.password);
    });

    it('should throw ConflictException if email already exists', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if account not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      accountRepository.findById.mockResolvedValue(null);

      await expect(service.register(registerDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if role not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      accountRepository.findById.mockResolvedValue(mockAccount);
      roleRepository.findById.mockResolvedValue(null);

      await expect(service.register(registerDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should return tokens for valid credentials', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      passwordService.compare.mockResolvedValue(true);
      userRepository.updateSignInInfo.mockResolvedValue(mockUser);
      tokenService.generateTokenPair.mockReturnValue(mockTokenPair);
      userRepository.updateRefreshToken.mockResolvedValue(mockUser);

      const result = await service.login(loginDto);

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('accessToken');
      expect(result.refreshToken).toBe('refreshToken');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw UnauthorizedException for wrong email', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      passwordService.compare.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      userRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should update sign_in_count on successful login', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      passwordService.compare.mockResolvedValue(true);
      userRepository.updateSignInInfo.mockResolvedValue(mockUser);
      tokenService.generateTokenPair.mockReturnValue(mockTokenPair);
      userRepository.updateRefreshToken.mockResolvedValue(mockUser);

      await service.login(loginDto);

      expect(userRepository.updateSignInInfo).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('refresh', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'refreshToken',
    };

    it('should return new tokens for valid refresh token', async () => {
      tokenService.verifyRefreshToken.mockReturnValue({ sub: 1 });
      userRepository.findById.mockResolvedValue(mockUser);
      tokenService.generateTokenPair.mockReturnValue(mockTokenPair);
      userRepository.updateRefreshToken.mockResolvedValue(mockUser);

      const result = await service.refresh(refreshTokenDto);

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('accessToken');
      expect(result.refreshToken).toBe('refreshToken');
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      tokenService.verifyRefreshToken.mockReturnValue({ sub: 1 });
      userRepository.findById.mockResolvedValue({
        ...mockUser,
        refreshTokenExpiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refresh(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for mismatched refresh token', async () => {
      tokenService.verifyRefreshToken.mockReturnValue({ sub: 1 });
      userRepository.findById.mockResolvedValue({
        ...mockUser,
        refreshToken: 'differentToken',
      });

      await expect(service.refresh(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for missing refresh token', async () => {
      tokenService.verifyRefreshToken.mockReturnValue({ sub: 1 });
      userRepository.findById.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });

      await expect(service.refresh(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should clear refresh token from DB', async () => {
      userRepository.updateRefreshToken.mockResolvedValue(mockUser);

      const result = await service.logout(1);

      expect(result.message).toBe('Logged out successfully');
      expect(userRepository.updateRefreshToken).toHaveBeenCalledWith(
        1,
        null,
        null,
      );
    });
  });

  describe('logoutAll', () => {
    it('should clear all refresh tokens from DB', async () => {
      userRepository.clearAllRefreshTokens.mockResolvedValue(mockUser);

      const result = await service.logoutAll(1);

      expect(result.message).toBe('All sessions terminated successfully');
      expect(userRepository.clearAllRefreshTokens).toHaveBeenCalledWith(1);
    });
  });

  describe('getMe', () => {
    it('should return user profile without sensitive fields', async () => {
      userRepository.findByIdWithRole.mockResolvedValue({
        ...mockUser,
        role: mockRole,
      });

      const result = await service.getMe(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(result).not.toHaveProperty('passwordDigest');
      expect(result).not.toHaveProperty('refreshToken');
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findByIdWithRole.mockResolvedValue(null);

      await expect(service.getMe(999)).rejects.toThrow(NotFoundException);
    });
  });
});
