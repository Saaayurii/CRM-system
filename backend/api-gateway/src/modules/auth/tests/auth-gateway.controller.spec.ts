import { Test, TestingModule } from '@nestjs/testing';
import { AuthGatewayController } from '../auth-gateway.controller';
import { ProxyService } from '../../../common/services/proxy.service';

describe('AuthGatewayController', () => {
  let controller: AuthGatewayController;
  let proxyService: jest.Mocked<ProxyService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthGatewayController],
      providers: [
        {
          provide: ProxyService,
          useValue: {
            forward: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthGatewayController>(AuthGatewayController);
    proxyService = module.get(ProxyService);
  });

  describe('register', () => {
    it('should forward register request to auth service', async () => {
      const body = {
        accountId: 1,
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        roleId: 1,
      };

      const expectedResponse = {
        accessToken: 'token',
        refreshToken: 'refresh',
        user: { id: 1, email: 'test@example.com' },
      };

      proxyService.forward.mockResolvedValue(expectedResponse);

      const result = await controller.register(body);

      expect(proxyService.forward).toHaveBeenCalledWith('auth', {
        method: 'POST',
        path: '/auth/register',
        data: body,
      });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('login', () => {
    it('should forward login request to auth service', async () => {
      const body = {
        email: 'test@example.com',
        password: 'password123',
      };

      const expectedResponse = {
        accessToken: 'token',
        refreshToken: 'refresh',
        user: { id: 1, email: 'test@example.com' },
      };

      proxyService.forward.mockResolvedValue(expectedResponse);

      const result = await controller.login(body);

      expect(proxyService.forward).toHaveBeenCalledWith('auth', {
        method: 'POST',
        path: '/auth/login',
        data: body,
      });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('refresh', () => {
    it('should forward refresh request to auth service', async () => {
      const body = { refreshToken: 'refresh-token' };

      const expectedResponse = {
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
      };

      proxyService.forward.mockResolvedValue(expectedResponse);

      const result = await controller.refresh(body);

      expect(proxyService.forward).toHaveBeenCalledWith('auth', {
        method: 'POST',
        path: '/auth/refresh',
        data: body,
      });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('logout', () => {
    it('should forward logout request with authorization header', async () => {
      const authorization = 'Bearer access-token';
      const expectedResponse = { message: 'Logged out successfully' };

      proxyService.forward.mockResolvedValue(expectedResponse);

      const result = await controller.logout(authorization);

      expect(proxyService.forward).toHaveBeenCalledWith('auth', {
        method: 'POST',
        path: '/auth/logout',
        headers: { Authorization: authorization },
      });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('logoutAll', () => {
    it('should forward logout-all request with authorization header', async () => {
      const authorization = 'Bearer access-token';
      const expectedResponse = { message: 'All sessions terminated successfully' };

      proxyService.forward.mockResolvedValue(expectedResponse);

      const result = await controller.logoutAll(authorization);

      expect(proxyService.forward).toHaveBeenCalledWith('auth', {
        method: 'POST',
        path: '/auth/logout-all',
        headers: { Authorization: authorization },
      });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getMe', () => {
    it('should forward me request with authorization header', async () => {
      const authorization = 'Bearer access-token';
      const expectedResponse = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
      };

      proxyService.forward.mockResolvedValue(expectedResponse);

      const result = await controller.getMe(authorization);

      expect(proxyService.forward).toHaveBeenCalledWith('auth', {
        method: 'GET',
        path: '/auth/me',
        headers: { Authorization: authorization },
      });
      expect(result).toEqual(expectedResponse);
    });
  });
});
