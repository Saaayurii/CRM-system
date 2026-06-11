import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class PresenceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PresenceService.name);
  private redis: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('redis.host') || 'localhost';
    const port = this.configService.get<number>('redis.port') || 6379;
    this.redis = new Redis({ host, port });
    this.logger.log(
      `Connected to Redis at ${host}:${port} for presence tracking`,
    );
  }

  onModuleDestroy() {
    this.redis?.disconnect();
  }

  async setUserOnline(userId: number, socketId: string): Promise<void> {
    const now = Date.now();
    await Promise.all([
      this.redis.sadd(`presence:user:${userId}`, socketId),
      this.redis.zadd('presence:online', now.toString(), userId.toString()),
      this.redis.hset('presence:lastseen', userId.toString(), now.toString()),
    ]);
    this.logger.debug(`User ${userId} online (socket: ${socketId})`);
  }

  async removeConnection(userId: number, socketId: string): Promise<boolean> {
    await this.redis.srem(`presence:user:${userId}`, socketId);
    const remaining = await this.redis.scard(`presence:user:${userId}`);

    if (remaining === 0) {
      await this.setUserOffline(userId);
      return false;
    }

    return true;
  }

  async setUserOffline(userId: number): Promise<void> {
    await Promise.all([
      this.redis.del(`presence:user:${userId}`),
      this.redis.zrem('presence:online', userId.toString()),
      this.redis.hset('presence:lastseen', userId.toString(), Date.now().toString()),
    ]);
    this.logger.debug(`User ${userId} offline`);
  }

  async isUserOnline(userId: number): Promise<boolean> {
    const score = await this.redis.zscore('presence:online', userId.toString());
    return score !== null;
  }

  async getOnlineUsers(userIds: number[]): Promise<Record<number, boolean>> {
    if (userIds.length === 0) return {};

    const pipeline = this.redis.pipeline();
    for (const userId of userIds) {
      pipeline.zscore('presence:online', userId.toString());
    }

    const results = await pipeline.exec();
    const online: Record<number, boolean> = {};

    userIds.forEach((userId, index) => {
      const [err, score] = results[index];
      online[userId] = !err && score !== null;
    });

    return online;
  }

  async getOnlineUserIds(): Promise<number[]> {
    const members = await this.redis.zrangebyscore(
      'presence:online',
      '-inf',
      '+inf',
    );
    return members.map((id) => parseInt(id, 10));
  }

  /** Heartbeat: продлевает «свежесть» presence для живых подключений. */
  async refreshUsers(userIds: number[]): Promise<void> {
    if (userIds.length === 0) return;
    const now = Date.now();
    const args: (string | number)[] = [];
    const lastSeenArgs: string[] = [];
    for (const id of userIds) {
      args.push(now, id.toString());
      lastSeenArgs.push(id.toString(), now.toString());
    }
    await Promise.all([
      this.redis.zadd('presence:online', ...args),
      // Онлайн-пользователи тоже обновляют lastSeen: при жёстком падении
      // сервиса «был(а) в сети» будет точен до последнего heartbeat
      this.redis.hset('presence:lastseen', ...lastSeenArgs),
    ]);
  }

  /**
   * Удаляет protухшие presence-записи (heartbeat не приходил дольше maxAgeMs):
   * сокеты, умершие без handleDisconnect (рестарт сервиса, обрыв сети),
   * иначе пользователь остаётся «в сети» навсегда. Возвращает их userIds.
   */
  async sweepStale(maxAgeMs: number): Promise<number[]> {
    const cutoff = (Date.now() - maxAgeMs).toString();
    const stale = await this.redis.zrangebyscore('presence:online', '-inf', cutoff);
    if (stale.length > 0) {
      const pipeline = this.redis.pipeline();
      pipeline.zremrangebyscore('presence:online', '-inf', cutoff);
      for (const id of stale) {
        pipeline.del(`presence:user:${id}`);
      }
      await pipeline.exec();
    }
    return stale.map((id) => parseInt(id, 10));
  }

  /** Когда пользователи были в сети последний раз (ms epoch), null — неизвестно. */
  async getLastSeen(userIds: number[]): Promise<Record<number, number | null>> {
    if (userIds.length === 0) return {};
    const values = await this.redis.hmget(
      'presence:lastseen',
      ...userIds.map((id) => id.toString()),
    );
    const result: Record<number, number | null> = {};
    userIds.forEach((id, i) => {
      const raw = values[i];
      result[id] = raw ? parseInt(raw, 10) : null;
    });
    return result;
  }

  getRedisClient(): Redis {
    return this.redis;
  }
}
