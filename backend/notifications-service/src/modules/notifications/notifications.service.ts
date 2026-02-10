import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { NotificationRepository } from './repositories/notification.repository';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from './dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  // --- Notifications ---

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
    const notification =
      await this.notificationRepository.findNotificationById(id, accountId);
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    return notification;
  }

  async createNotification(
    accountId: number,
    dto: CreateNotificationDto,
  ) {
    return this.notificationRepository.createNotification({
      accountId,
      userId: dto.userId,
      title: dto.title,
      message: dto.message,
      notificationType: dto.notificationType,
      entityType: dto.entityType,
      entityId: dto.entityId,
      channels: dto.channels || ['in_app'],
      priority: dto.priority || 2,
      actionUrl: dto.actionUrl,
    });
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

  // --- Announcements ---

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
    const announcement =
      await this.notificationRepository.findAnnouncementById(id, accountId);
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
