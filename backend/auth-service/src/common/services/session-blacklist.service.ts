import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as crypto from 'crypto';

const BLACKLIST_PREFIX = 'sess:revoked:';
const GRACE_PREFIX = 'refresh:grace:';

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

  // ── Refresh-token rotation grace window ──────────────────────────────
  // При ротации refresh-токена старый мгновенно перестаёт быть валидным в БД.
  // Из-за этого вторая вкладка/параллельный запрос, пришедший со «старым»
  // токеном сразу после ротации, получал 401 → разлогин. Чтобы это пережить,
  // на короткое окно (≈60с) запоминаем связку старый→новый: опоздавший запрос
  // получит актуальную пару токенов вместо ошибки.
  private graceKey(token: string): string {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return `${GRACE_PREFIX}${hash}`;
  }

  /** Запомнить, что `oldToken` ротирован в `newToken` (сессия `sessionId`). */
  async rememberRotation(
    oldToken: string,
    newToken: string,
    sessionId: number,
    ttlSeconds = 60,
  ): Promise<void> {
    try {
      await this.redis.set(
        this.graceKey(oldToken),
        JSON.stringify({ newToken, sessionId }),
        'EX',
        ttlSeconds,
      );
    } catch (err) {
      this.logger.warn(`Failed to store rotation grace: ${(err as Error).message}`);
    }
  }

  /** Если `oldToken` был недавно ротирован — вернуть новую пару, иначе null. */
  async getRotatedPair(
    oldToken: string,
  ): Promise<{ newToken: string; sessionId: number } | null> {
    try {
      const val = await this.redis.get(this.graceKey(oldToken));
      return val ? JSON.parse(val) : null;
    } catch {
      return null; // fail open
    }
  }
}
