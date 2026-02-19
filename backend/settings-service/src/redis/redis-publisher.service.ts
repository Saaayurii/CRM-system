import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const MAINTENANCE_CHANNEL = 'crm:maintenance';

export interface MaintenanceEvent {
  accountId: number;
  mode: boolean;
  allowedRoles: string[];
}

@Injectable()
export class RedisPublisherService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisPublisherService.name);
  private readonly client: Redis;

  constructor(private readonly config: ConfigService) {
    this.client = new Redis({
      host: this.config.get<string>('redis.host') || 'localhost',
      port: this.config.get<number>('redis.port') || 6379,
    });
    this.client.on('error', (err) =>
      this.logger.error('Redis publisher error', err),
    );
  }

  async publishMaintenance(event: MaintenanceEvent): Promise<void> {
    await this.client.publish(
      `${MAINTENANCE_CHANNEL}:${event.accountId}`,
      JSON.stringify(event),
    );
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
