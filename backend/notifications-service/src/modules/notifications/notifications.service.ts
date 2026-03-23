import {
  Injectable,
  NotFoundException,
  Logger,
  MessageEvent,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Subject, Observable, map, interval } from 'rxjs';
import * as webpush from 'web-push';
import { NotificationRepository } from './repositories/notification.repository';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  SavePushSubscriptionDto,
  DeletePushSubscriptionDto,
} from './dto';
import { shouldPushToRole } from '../../config/notification-roles.config';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private notificationSubjects = new Map<number, Subject<any>>();
  private webPushEnabled = false;

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const email =
      this.configService.get<string>('VAPID_EMAIL') || 'mailto:admin@crm.local';

    if (publicKey && privateKey) {
      try {
        webpush.setVapidDetails(email, publicKey, privateKey);
        this.webPushEnabled = true;
        this.logger.log('Web Push (VAPID) initialized successfully');
      } catch (err) {
        this.logger.error('Failed to initialize VAPID — check key format', err);
      }
    } else {
      this.logger.warn(
        'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set. ' +
          'Run: npx web-push generate-vapid-keys and add to .env',
      );
    }
  }

  // ─── SSE Stream ────────────────────────────────────────────────────────────

  getNotificationStream(userId: number): Observable<MessageEvent> {
    if (!this.notificationSubjects.has(userId)) {
      this.notificationSubjects.set(userId, new Subject<any>());
    }

    const subject = this.notificationSubjects.get(userId)!;

    return new Observable<MessageEvent>((subscriber) => {
      const heartbeat = interval(30000).subscribe(() => {
        subscriber.next({ data: { type: 'heartbeat' } } as MessageEvent);
      });

      const subscription = subject
        .pipe(
          map(
            (notification) =>
              ({
                type: 'notification',
                data: notification,
              }) as MessageEvent,
          ),
        )
        .subscribe((event) => subscriber.next(event));

      return () => {
        heartbeat.unsubscribe();
        subscription.unsubscribe();
      };
    });
  }

  pushNotification(userId: number, notification: any): void {
    const subject = this.notificationSubjects.get(userId);
    if (subject) {
      subject.next(notification);
    }
  }

  // ─── Web Push ───────────────────────────────────────────────────────────────

  getVapidPublicKey(): string | null {
    return this.configService.get<string>('VAPID_PUBLIC_KEY') ?? null;
  }

  async savePushSubscription(
    userId: number,
    accountId: number,
    roleId: number | undefined,
    dto: SavePushSubscriptionDto,
  ) {
    return this.notificationRepository.savePushSubscription({
      userId,
      accountId,
      roleId,
      endpoint: dto.endpoint,
      p256dh: dto.p256dh,
      auth: dto.auth,
      userAgent: dto.userAgent,
    });
  }

  async deletePushSubscription(
    userId: number,
    dto: DeletePushSubscriptionDto,
  ) {
    await this.notificationRepository.deletePushSubscription(
      userId,
      dto.endpoint,
    );
    return { message: 'Push subscription removed' };
  }

  private async sendWebPushToUser(
    userId: number,
    notification: any,
  ): Promise<void> {
    if (!this.webPushEnabled) return;

    try {
      const subscriptions =
        await this.notificationRepository.getPushSubscriptionsByUserId(userId);

      if (!subscriptions.length) return;

      const payload = JSON.stringify({
        title: notification.title,
        message: notification.message ?? '',
        notificationType: notification.notificationType,
        actionUrl: notification.actionUrl ?? '/dashboard',
        priority: notification.priority,
      });

      const results = await Promise.allSettled(
        subscriptions.map((sub: any) => {
          if (
            !shouldPushToRole(notification.notificationType, sub.roleId ?? undefined)
          ) {
            return Promise.resolve();
          }

          return webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          );
        }),
      );

      // Remove expired/invalid subscriptions (410 Gone)
      const staleEndpoints: string[] = [];
      results.forEach((result, idx) => {
        if (
          result.status === 'rejected' &&
          (result.reason as any)?.statusCode === 410
        ) {
          staleEndpoints.push(subscriptions[idx].endpoint);
        }
      });

      if (staleEndpoints.length) {
        await Promise.all(
          staleEndpoints.map((ep) =>
            this.notificationRepository.deletePushSubscription(userId, ep),
          ),
        );
        this.logger.debug(
          `Removed ${staleEndpoints.length} stale push subscription(s) for user ${userId}`,
        );
      }
    } catch (err) {
      this.logger.error(`Web Push error for user ${userId}`, err);
    }
  }

  // ─── Notifications ──────────────────────────────────────────────────────────

  async findAllNotifications(
    accountId: number,
    userId: number,
    page: number = 1,
    limit: number = 20,
    isRead?: boolean,
  ) {
    return this.notificationRepository.findAllNotifications(
      accountId,
      userId,
      page,
      limit,
      isRead,
    );
  }

  async findNotificationById(id: number, accountId: number) {
    const notification = await this.notificationRepository.findNotificationById(
      id,
      accountId,
    );
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    return notification;
  }

  async createNotification(accountId: number, dto: CreateNotificationDto) {
    const channels = dto.channels || ['in_app'];

    const notification = await this.notificationRepository.createNotification({
      accountId,
      userId: dto.userId,
      title: dto.title,
      message: dto.message,
      notificationType: dto.notificationType,
      entityType: dto.entityType,
      entityId: dto.entityId,
      channels,
      priority: dto.priority || 2,
      actionUrl: dto.actionUrl,
    });

    // SSE (in-app real-time)
    this.pushNotification(dto.userId, notification);

    // Web Push (mobile / background)
    if (channels.includes('push')) {
      void this.sendWebPushToUser(dto.userId, notification);
    }

    return notification;
  }

  async updateNotification(
    id: number,
    accountId: number,
    dto: UpdateNotificationDto,
  ) {
    await this.findNotificationById(id, accountId);
    await this.notificationRepository.updateNotification(id, accountId, dto);
    return this.findNotificationById(id, accountId);
  }

  async markAsRead(id: number, accountId: number) {
    await this.findNotificationById(id, accountId);
    await this.notificationRepository.markAsRead(id, accountId);
    return this.findNotificationById(id, accountId);
  }

  // ─── Announcements ──────────────────────────────────────────────────────────

  async findAllAnnouncements(
    accountId: number,
    page: number = 1,
    limit: number = 20,
  ) {
    return this.notificationRepository.findAllAnnouncements(
      accountId,
      page,
      limit,
    );
  }

  async findAnnouncementById(id: number, accountId: number) {
    const announcement = await this.notificationRepository.findAnnouncementById(
      id,
      accountId,
    );
    if (!announcement) {
      throw new NotFoundException(`Announcement with ID ${id} not found`);
    }
    return announcement;
  }

  async createAnnouncement(
    accountId: number,
    userId: number,
    dto: CreateAnnouncementDto,
  ) {
    return this.notificationRepository.createAnnouncement({
      accountId,
      title: dto.title,
      content: dto.content,
      announcementType: dto.announcementType,
      priority: dto.priority || 2,
      publishedByUserId: userId,
      publishedAt: new Date(),
      targetAudience: dto.targetAudience || {},
      isPinned: dto.isPinned || false,
      attachments: dto.attachments || [],
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
  }

  async updateAnnouncement(
    id: number,
    accountId: number,
    dto: UpdateAnnouncementDto,
  ) {
    await this.findAnnouncementById(id, accountId);
    const updateData: any = { ...dto };
    if (dto.expiresAt) {
      updateData.expiresAt = new Date(dto.expiresAt);
    }
    await this.notificationRepository.updateAnnouncement(
      id,
      accountId,
      updateData,
    );
    return this.findAnnouncementById(id, accountId);
  }

  async deleteAnnouncement(id: number, accountId: number) {
    await this.findAnnouncementById(id, accountId);
    await this.notificationRepository.deleteAnnouncement(id, accountId);
    return { message: `Announcement with ID ${id} deleted successfully` };
  }
}
