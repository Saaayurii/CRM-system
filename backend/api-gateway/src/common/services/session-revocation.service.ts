import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Must match auth-service's SessionBlacklistService prefix. Auth writes
 * `sess:revoked:<sessionId>` (TTL = remaining access-token lifetime) on logout /
 * logout-all / session revocation; the gateway reads it here so a revoked
 * session is rejected within ~one access-token TTL instead of living until exp.
 */
const BLACKLIST_PREFIX = 'sess:revoked:';

@Injectable()
export class SessionRevocationService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;
  private readonly logger = new Logger(SessionRevocationService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.redis = new Redis({
      host: this.configService.get<string>('redis.host') || 'localhost',
      port: this.configService.get<number>('redis.port') || 6379,
      lazyConnect: true,
      // Don't queue lookups forever if Redis is down — fail open quickly.
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    this.redis.on('error', (err) => {
      // ioredis emits on every reconnect attempt; keep it quiet at warn level.
      this.logger.warn(`Redis error: ${err.message}`);
    });
    this.redis.connect().catch((err) => {
      this.logger.warn(`Redis connect failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    try {
      await this.redis?.quit();
    } catch {
      /* already disconnected */
    }
  }

  /**
   * Returns true if the session is blacklisted. Fails OPEN (returns false) when
   * Redis is unavailable — a Redis outage must not lock every user out.
   */
  async isRevoked(sessionId: number): Promise<boolean> {
    try {
      const val = await this.redis.get(`${BLACKLIST_PREFIX}${sessionId}`);
      return val !== null;
    } catch {
      return false;
    }
  }
}
