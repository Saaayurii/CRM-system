import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, retry, throwError, timer } from 'rxjs';
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { RequestContextService } from './request-context.service';
import { CircuitBreaker } from './circuit-breaker';

export interface ProxyOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  data?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  /** Per-request timeout override (ms). Use a higher value for heavy endpoints. */
  timeoutMs?: number;
}

/** Default per-request timeout — bounds hung downstreams without breaking heavy syncs. */
const DEFAULT_TIMEOUT_MS = 15_000;
/** Retries for idempotent (GET) requests only — POST/PUT/PATCH/DELETE are never retried. */
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 200;
const RETRY_MAX_DELAY_MS = 2_000;

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly serviceUrls: Record<string, string>;
  /** One breaker shared per gateway instance, keyed by downstream service name. */
  private readonly breaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeoutMs: 15_000,
  });

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly requestContext: RequestContextService,
  ) {
    this.serviceUrls = {
      auth:
        this.configService.get<string>('services.auth') ||
        'http://localhost:3001',
      users:
        this.configService.get<string>('services.users') ||
        'http://localhost:3002',
      projects:
        this.configService.get<string>('services.projects') ||
        'http://localhost:3003',
      tasks:
        this.configService.get<string>('services.tasks') ||
        'http://localhost:3004',
      materials:
        this.configService.get<string>('services.materials') ||
        'http://localhost:3005',
      suppliers:
        this.configService.get<string>('services.suppliers') ||
        'http://localhost:3006',
      finance:
        this.configService.get<string>('services.finance') ||
        'http://localhost:3007',
      inspections:
        this.configService.get<string>('services.inspections') ||
        'http://localhost:3008',
      hr:
        this.configService.get<string>('services.hr') ||
        'http://localhost:3009',
      notifications:
        this.configService.get<string>('services.notifications') ||
        'http://localhost:3010',
      chat:
        this.configService.get<string>('services.chat') ||
        'http://localhost:3011',
      calendar:
        this.configService.get<string>('services.calendar') ||
        'http://localhost:3012',
      equipment:
        this.configService.get<string>('services.equipment') ||
        'http://localhost:3013',
      documents:
        this.configService.get<string>('services.documents') ||
        'http://localhost:3014',
      reports:
        this.configService.get<string>('services.reports') ||
        'http://localhost:3015',
      dictionary:
        this.configService.get<string>('services.dictionary') ||
        'http://localhost:3016',
      audit:
        this.configService.get<string>('services.audit') ||
        'http://localhost:3017',
      clients:
        this.configService.get<string>('services.clients') ||
        'http://localhost:3018',
      wiki:
        this.configService.get<string>('services.wiki') ||
        'http://localhost:3019',
      training:
        this.configService.get<string>('services.training') ||
        'http://localhost:3020',
      automation:
        this.configService.get<string>('services.automation') ||
        'http://localhost:3021',
      settings:
        this.configService.get<string>('services.settings') ||
        'http://localhost:3022',
      dashboard:
        this.configService.get<string>('services.dashboard') ||
        'http://localhost:3023',
    };
  }

  async forward<T>(service: string, options: ProxyOptions): Promise<T> {
    const baseUrl = this.serviceUrls[service];
    if (!baseUrl) {
      throw new Error(`Unknown service: ${service}`);
    }

    // Fail fast while the downstream is known-bad — don't pile requests onto it.
    if (!this.breaker.canRequest(service)) {
      this.logger.warn(`Circuit OPEN for "${service}" — short-circuiting request`);
      throw new ServiceUnavailableException(
        `Service "${service}" is temporarily unavailable`,
      );
    }

    const url = `${baseUrl}${options.path}`;
    const accountIdOverride = this.requestContext.getAccountIdOverride();
    const extraHeaders: Record<string, string> = accountIdOverride
      ? { 'x-account-id': accountIdOverride }
      : {};
    const config: AxiosRequestConfig = {
      method: options.method,
      url,
      data: options.data,
      headers: { ...extraHeaders, ...options.headers },
      params: options.params,
      timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    };

    this.logger.debug(`Proxying ${options.method} ${url}`);

    const isIdempotent = options.method === 'GET';

    try {
      const response: AxiosResponse<T> = await firstValueFrom(
        this.httpService.request<T>(config).pipe(
          retry({
            count: isIdempotent ? MAX_RETRIES : 0,
            delay: (error, retryCount) => {
              // Only retry transient infra failures; surface 4xx immediately.
              if (!this.isInfraFailure(error)) {
                return throwError(() => error);
              }
              const backoff = Math.min(
                RETRY_BASE_DELAY_MS * 2 ** (retryCount - 1),
                RETRY_MAX_DELAY_MS,
              );
              return timer(backoff);
            },
          }),
        ),
      );

      this.breaker.recordSuccess(service);
      return response.data;
    } catch (error) {
      // 4xx (validation/not-found/conflict) is a normal business response — it
      // must not trip the breaker. Only network/timeout/5xx count as failures.
      if (this.isInfraFailure(error)) {
        this.breaker.recordFailure(service);
      }
      throw error;
    }
  }

  /** Network error, timeout, or upstream 5xx — i.e. the downstream is unhealthy. */
  private isInfraFailure(error: unknown): boolean {
    const axiosError = error as AxiosError;
    if (axiosError?.isAxiosError) {
      if (!axiosError.response) return true; // ECONNREFUSED / ECONNABORTED (timeout) / etc.
      return axiosError.response.status >= 500;
    }
    return false;
  }

  getServiceUrl(service: string): string {
    return this.serviceUrls[service];
  }
}
