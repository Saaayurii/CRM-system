import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly client: Redis;

  constructor(private readonly config: ConfigService) {
    super();
    this.client = new Redis({
      host: this.config.get<string>('redis.host') || 'localhost',
      port: this.config.get<number>('redis.port') || 6379,
      lazyConnect: true,
      connectTimeout: 3000,
    });
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.client.ping();
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}
