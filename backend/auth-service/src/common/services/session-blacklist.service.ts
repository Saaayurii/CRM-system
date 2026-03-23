import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const BLACKLIST_PREFIX = 'sess:revoked:';

@Injectable()
export class SessionBlacklistService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;
  private readonly logger = new Logger(SessionBlacklistService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.redis = new Redis({
      host: this.configService.get<string>('redis.host') || 'localhost',
      port: this.configService.get<number>('redis.port') || 6379,
      lazyConnect: true,
    });
    this.redis.connect().catch((err) => {
      this.logger.warn(`Redis connect failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  /** Add session to blacklist; TTL = remaining access token lifetime (seconds) */
  async revoke(sessionId: number, ttlSeconds = 900): Promise<void> {
    try {
      await this.redis.set(`${BLACKLIST_PREFIX}${sessionId}`, '1', 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`Failed to revoke session ${sessionId} in Redis: ${(err as Error).message}`);
    }
  }

  /** Returns true if session is in the blacklist */
  async isRevoked(sessionId: number): Promise<boolean> {
    try {
      const val = await this.redis.get(`${BLACKLIST_PREFIX}${sessionId}`);
      return val !== null;
    } catch {
      return false; // fail open — don't block users if Redis is down
    }
  }
}
