import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { ProxyService, ProxyOptions } from '../proxy.service';

describe('ProxyService', () => {
  let service: ProxyService;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProxyService,
        {
          provide: HttpService,
          useValue: {
            request: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                'services.auth': 'http://auth-service:3001',
                'services.users': 'http://users-service:3002',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ProxyService>(ProxyService);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
  });

  describe('forward', () => {
    it('should construct correct URL from service and path', async () => {
      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.request.mockReturnValue(of(mockResponse));

      const options: ProxyOptions = {
        method: 'GET',
        path: '/auth/me',
      };

      await service.forward('auth', options);

      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'http://auth-service:3001/auth/me',
        }),
      );
    });

    it('should forward headers correctly', async () => {
      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.request.mockReturnValue(of(mockResponse));

      const options: ProxyOptions = {
        method: 'GET',
        path: '/auth/me',
        headers: { Authorization: 'Bearer token123' },
      };

      await service.forward('auth', options);

      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { Authorization: 'Bearer token123' },
        }),
      );
    });

    it('should forward request body correctly', async () => {
      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.request.mockReturnValue(of(mockResponse));

      const requestBody = {
        email: 'test@example.com',
        password: 'password123',
      };
      const options: ProxyOptions = {
        method: 'POST',
        path: '/auth/login',
        data: requestBody,
      };

      await service.forward('auth', options);

      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          data: requestBody,
        }),
      );
    });

    it('should throw error for unknown service', async () => {
      const options: ProxyOptions = {
        method: 'GET',
        path: '/test',
      };

      await expect(service.forward('unknown', options)).rejects.toThrow(
        'Unknown service: unknown',
      );
    });

    it('should return response data', async () => {
      const expectedData = { user: { id: 1, email: 'test@example.com' } };
      const mockResponse: AxiosResponse = {
        data: expectedData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.request.mockReturnValue(of(mockResponse));

      const options: ProxyOptions = {
        method: 'GET',
        path: '/auth/me',
      };

      const result = await service.forward('auth', options);

      expect(result).toEqual(expectedData);
    });
  });

  describe('getServiceUrl', () => {
    it('should return correct service URL', () => {
      expect(service.getServiceUrl('auth')).toBe('http://auth-service:3001');
    });

    it('should return undefined for unknown service', () => {
      expect(service.getServiceUrl('unknown')).toBeUndefined();
    });
  });
});
