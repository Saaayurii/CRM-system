import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import Redis from 'ioredis';

const MAINTENANCE_CHANNEL = 'crm:maintenance';

export interface MaintenanceEvent {
  accountId: number;
  mode: boolean;
  allowedRoles: string[];
}

@Injectable()
export class MaintenanceSubService implements OnModuleDestroy {
  private readonly logger = new Logger(MaintenanceSubService.name);
  private readonly subscriber: Redis;
  private readonly events$ = new Subject<MaintenanceEvent>();

  constructor(private readonly config: ConfigService) {
    this.subscriber = new Redis({
      host: this.config.get<string>('redis.host') || 'localhost',
      port: this.config.get<number>('redis.port') || 6379,
    });

    this.subscriber.on('error', (err) =>
      this.logger.error('Redis subscriber error', err),
    );

    // Subscribe to all account channels via pattern
    this.subscriber.psubscribe(`${MAINTENANCE_CHANNEL}:*`, (err) => {
      if (err) this.logger.error('psubscribe error', err);
    });

    this.subscriber.on('pmessage', (_pattern, _channel, message) => {
      try {
        const event: MaintenanceEvent = JSON.parse(message);
        this.events$.next(event);
      } catch {
        // ignore malformed messages
      }
    });
  }

  /** Returns an SSE-ready Observable for the given accountId */
  forAccount(accountId: number): Observable<MaintenanceEvent> {
    return this.events$.pipe(
      filter((e) => e.accountId === accountId),
      map((e) => e),
    );
  }

  onModuleDestroy() {
    this.subscriber.disconnect();
  }
}
