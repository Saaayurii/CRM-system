import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Thin HTTP client for notifications-service — used by the `notify` automation action. */
@Injectable()
export class NotificationsClientService {
  private readonly logger = new Logger(NotificationsClientService.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl =
      this.config.get<string>('services.notifications') ||
      'http://notifications-service:3010';
  }

  /** Broadcast to roles/users (minus an excluded actor). Returns recipients summary. */
  async broadcast(payload: {
    accountId: number;
    roleIds?: number[];
    userIds?: number[];
    excludeUserId?: number;
    title: string;
    message?: string;
    notificationType?: string;
    priority?: number;
    channels?: string[];
    actionUrl?: string;
    entityType?: string;
    entityId?: number;
  }): Promise<void> {
    if (!payload.roleIds?.length && !payload.userIds?.length) return;
    const res = await fetch(`${this.baseUrl}/notifications/internal/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        notificationType: payload.notificationType ?? 'automation',
        priority: payload.priority ?? 2,
        channels: payload.channels ?? ['in_app', 'push'],
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      throw new Error(`notifications-service responded ${res.status}`);
    }
  }
}
