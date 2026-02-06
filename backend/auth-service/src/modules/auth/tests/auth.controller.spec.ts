import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    phone: '+7 999 123 4567',
    avatarUrl: undefined,
    accountId: 1,
    roleId: 1,
    position: 'Developer',
    isActive: true,
    createdAt: new Date(),
  };

  const mockAuthResponse = {
    accessToken: 'accessToken',
    refreshToken: 'refreshToken',
    user: mockUser,
  };

  const mockTokenResponse = {
    accessToken: 'newAccessToken',
    refreshToken: 'newRefreshToken',
  };

  const mockJwtPayload: JwtPayload = {
    sub: 1,
    email: 'test@example.com',
    roleId: 1,
    accountId: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
            logoutAll: jest.fn(),
            getMe: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
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

    it('should call authService.register and return result', async () => {
      authService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should call authService.login and return result', async () => {
      authService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('refresh', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'refreshToken',
    };

    it('should call authService.refresh and return result', async () => {
      authService.refresh.mockResolvedValue(mockTokenResponse);

      const result = await controller.refresh(refreshTokenDto);

      expect(authService.refresh).toHaveBeenCalledWith(refreshTokenDto);
      expect(result).toEqual(mockTokenResponse);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with user id', async () => {
      const messageResponse = { message: 'Logged out successfully' };
      authService.logout.mockResolvedValue(messageResponse);

      const result = await controller.logout(mockJwtPayload);

      expect(authService.logout).toHaveBeenCalledWith(mockJwtPayload.sub);
      expect(result).toEqual(messageResponse);
    });
  });

  describe('logoutAll', () => {
    it('should call authService.logoutAll with user id', async () => {
      const messageResponse = { message: 'All sessions terminated successfully' };
      authService.logoutAll.mockResolvedValue(messageResponse);

      const result = await controller.logoutAll(mockJwtPayload);

      expect(authService.logoutAll).toHaveBeenCalledWith(mockJwtPayload.sub);
      expect(result).toEqual(messageResponse);
    });
  });

  describe('getMe', () => {
    it('should call authService.getMe with user id', async () => {
      authService.getMe.mockResolvedValue(mockUser);

      const result = await controller.getMe(mockJwtPayload);

      expect(authService.getMe).toHaveBeenCalledWith(mockJwtPayload.sub);
      expect(result).toEqual(mockUser);
    });
  });
});
