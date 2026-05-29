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

export interface BroadcastPayload {
  accountId: number;
  /** Fan out to every active user holding one of these roles (e.g. [1,2,4]). */
  roleIds?: number[];
  /** Explicit recipients (the directly affected users). */
  userIds?: number[];
  /** User to exclude — typically the actor who triggered the event. */
  excludeUserId?: number;
  title: string;
  message?: string;
  notificationType?: string;
  priority?: number;
  channels?: string[];
  actionUrl?: string;
  entityType?: string;
  entityId?: number;
}

/**
 * Thin HTTP client for the notifications-service.
 * All methods are fire-and-forget — errors are logged but never thrown,
 * so a failing notification never breaks the main business action.
 */
@Injectable()
export class NotificationsClientService {
  private readonly logger = new Logger(NotificationsClientService.name);
  private readonly baseUrl =
    process.env.NOTIFICATIONS_SERVICE_URL || 'http://notifications-service:3010';

  /** Notify a single user. */
  async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/notifications/internal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: payload.accountId,
          userId: payload.userId,
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

  /** Send to multiple users in parallel (fire-and-forget). */
  sendToMany(payloads: NotificationPayload[]): void {
    for (const p of payloads) void this.sendNotification(p);
  }

  /**
   * Broadcast to a computed audience: every active user with one of `roleIds`,
   * plus explicit `userIds`, minus `excludeUserId`. Fire-and-forget.
   */
  async broadcast(payload: BroadcastPayload): Promise<void> {
    if (!payload.roleIds?.length && !payload.userIds?.length) return;
    try {
      const res = await fetch(`${this.baseUrl}/notifications/internal/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: payload.accountId,
          roleIds: payload.roleIds,
          userIds: payload.userIds,
          excludeUserId: payload.excludeUserId,
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
        this.logger.warn(`notifications-service broadcast responded ${res.status}`);
      }
    } catch (err) {
      this.logger.error(
        `Failed to broadcast notification: ${(err as Error).message}`,
      );
    }
  }
}
