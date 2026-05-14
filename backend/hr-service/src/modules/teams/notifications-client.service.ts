import { Injectable, Logger } from '@nestjs/common';

export interface NotificationPayload {
  userId: number;
  accountId: number;
  title: string;
  message?: string;
  notificationType?: string;
  priority?: number;
  channels?: string[];
  actionUrl?: string;
  entityType?: string;
  entityId?: number;
}

@Injectable()
export class NotificationsClientService {
  private readonly logger = new Logger(NotificationsClientService.name);
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env.NOTIFICATIONS_SERVICE_URL ||
      'http://notifications-service:3010';
  }

  async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          notificationType: payload.notificationType ?? 'info',
          priority: payload.priority ?? 2,
          channels: payload.channels ?? ['in_app', 'push'],
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        this.logger.warn(`notifications-service responded ${res.status} for userId=${payload.userId}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send notification: ${(err as Error).message}`);
    }
  }

  sendToMany(payloads: NotificationPayload[]): void {
    for (const p of payloads) void this.sendNotification(p);
  }
}
