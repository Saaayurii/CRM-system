import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      configService.get<string>('NOTIFICATIONS_SERVICE_URL') ||
      'http://notifications-service:3010';
  }

  async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: payload.userId,
          accountId: payload.accountId,
          title: payload.title,
          message: payload.message,
          notificationType: payload.notificationType ?? 'info',
          priority: payload.priority ?? 2,
          channels: payload.channels ?? ['in_app', 'push'],
          actionUrl: payload.actionUrl,
          entityType: payload.entityType,
          entityId: payload.entityId,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        this.logger.warn(
          `notifications-service responded ${res.status} for userId=${payload.userId}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to send notification to userId=${payload.userId}: ${(err as Error).message}`,
      );
    }
  }

  sendToMany(payloads: NotificationPayload[]): void {
    for (const p of payloads) {
      void this.sendNotification(p);
    }
  }
}
