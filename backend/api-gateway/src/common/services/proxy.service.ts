import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface ProxyOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  data?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly serviceUrls: Record<string, string>;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.serviceUrls = {
      auth: this.configService.get<string>('services.auth') || 'http://localhost:3001',
      users: this.configService.get<string>('services.users') || 'http://localhost:3002',
      projects: this.configService.get<string>('services.projects') || 'http://localhost:3003',
      tasks: this.configService.get<string>('services.tasks') || 'http://localhost:3004',
      materials: this.configService.get<string>('services.materials') || 'http://localhost:3005',
      suppliers: this.configService.get<string>('services.suppliers') || 'http://localhost:3006',
      finance: this.configService.get<string>('services.finance') || 'http://localhost:3007',
      inspections: this.configService.get<string>('services.inspections') || 'http://localhost:3008',
      hr: this.configService.get<string>('services.hr') || 'http://localhost:3009',
      notifications: this.configService.get<string>('services.notifications') || 'http://localhost:3010',
    };
  }

  async forward<T>(service: string, options: ProxyOptions): Promise<T> {
    const baseUrl = this.serviceUrls[service];
    if (!baseUrl) {
      throw new Error(`Unknown service: ${service}`);
    }

    const url = `${baseUrl}${options.path}`;
    const config: AxiosRequestConfig = {
      method: options.method,
      url,
      data: options.data,
      headers: options.headers,
      params: options.params,
    };

    this.logger.debug(`Proxying ${options.method} ${url}`);

    const response: AxiosResponse<T> = await firstValueFrom(
      this.httpService.request<T>(config),
    );

    return response.data;
  }

  getServiceUrl(service: string): string {
    return this.serviceUrls[service];
  }
}
