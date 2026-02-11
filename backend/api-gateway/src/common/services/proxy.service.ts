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
      chat: this.configService.get<string>('services.chat') || 'http://localhost:3011',
      calendar: this.configService.get<string>('services.calendar') || 'http://localhost:3012',
      equipment: this.configService.get<string>('services.equipment') || 'http://localhost:3013',
      documents: this.configService.get<string>('services.documents') || 'http://localhost:3014',
      reports: this.configService.get<string>('services.reports') || 'http://localhost:3015',
      dictionary: this.configService.get<string>('services.dictionary') || 'http://localhost:3016',
      audit: this.configService.get<string>('services.audit') || 'http://localhost:3017',
      clients: this.configService.get<string>('services.clients') || 'http://localhost:3018',
      wiki: this.configService.get<string>('services.wiki') || 'http://localhost:3019',
      training: this.configService.get<string>('services.training') || 'http://localhost:3020',
      automation: this.configService.get<string>('services.automation') || 'http://localhost:3021',
      settings: this.configService.get<string>('services.settings') || 'http://localhost:3022',
      dashboard: this.configService.get<string>('services.dashboard') || 'http://localhost:3023',
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
