import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const FAIL_PREFIX = 'bf:fail:';
const LOCK_PREFIX = 'bf:lock:';

/**
 * Brute-force protection. Counts failed attempts per identifier in Redis and
 * locks the identifier after a threshold is reached. Two identifier namespaces
 * are used by the auth flow: `login:<email>` (password attempts) and
 * `otp:<userId>` (2FA code attempts).
 *
 * Fails open: if Redis is unavailable, login is never blocked by this service.
 */
@Injectable()
export class LoginThrottleService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;
  private readonly logger = new Logger(LoginThrottleService.name);

  constructor(private readonly configService: ConfigService) {}

  private get windowSec(): number {
    return (this.configService.get<number>('security.attemptWindowMinutes') ?? 15) * 60;
  }

  private get lockoutSec(): number {
    return (this.configService.get<number>('security.lockoutMinutes') ?? 15) * 60;
  }

  private get defaultMax(): number {
    return this.configService.get<number>('security.maxLoginAttempts') ?? 5;
  }

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
    try {
      await this.redis?.quit();
    } catch {
      /* ignore */
    }
  }

  /** Throws HTTP 429 if the identifier is currently locked. */
  async assertNotLocked(identifier: string): Promise<void> {
    const key = LOCK_PREFIX + identifier.toLowerCase();
    let ttl = 0;
    try {
      ttl = await this.redis.ttl(key);
    } catch {
      return; // fail open
    }
    if (ttl > 0) {
      const mins = Math.ceil(ttl / 60);
      throw new HttpException(
        `Слишком много неудачных попыток. Доступ временно заблокирован, попробуйте через ${mins} мин.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Record one failed attempt. When the count reaches the threshold the
   * identifier is locked for `lockoutMinutes`.
   * @param maxAttempts optional per-account override of the threshold.
   */
  async recordFailure(identifier: string, maxAttempts?: number): Promise<void> {
    const id = identifier.toLowerCase();
    const max = maxAttempts && maxAttempts > 0 ? maxAttempts : this.defaultMax;
    try {
      const count = await this.redis.incr(FAIL_PREFIX + id);
      if (count === 1) {
        await this.redis.expire(FAIL_PREFIX + id, this.windowSec);
      }
      if (count >= max) {
        await this.redis.set(LOCK_PREFIX + id, '1', 'EX', this.lockoutSec);
        await this.redis.del(FAIL_PREFIX + id);
      }
    } catch {
      /* fail open */
    }
  }

  /** Clear counters/lock for an identifier (call on successful auth). */
  async reset(identifier: string): Promise<void> {
    const id = identifier.toLowerCase();
    try {
      await this.redis.del(FAIL_PREFIX + id, LOCK_PREFIX + id);
    } catch {
      /* ignore */
    }
  }
}
