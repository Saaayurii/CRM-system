import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';
import { RedisHealthIndicator } from './redis-health.indicator';

@ApiTags('Health')
@Controller('api/v1/health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly redisIndicator: RedisHealthIndicator,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Full health check: gateway, redis, core services' })
  @ApiResponse({ status: 200, description: 'All systems healthy' })
  @ApiResponse({ status: 503, description: 'One or more systems unhealthy' })
  check() {
    const authUrl = this.config.get<string>('services.auth');
    const usersUrl = this.config.get<string>('services.users');

    return this.health.check([
      // Redis connectivity
      () => this.redisIndicator.isHealthy('redis'),

      // Memory: heap < 512 MB
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),

      // Core downstream services
      () => this.http.pingCheck('auth-service', `${authUrl}/health`),
      () => this.http.pingCheck('users-service', `${usersUrl}/health`),
    ]);
  }
}
