import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class NotificationRepository {
  private readonly logger = new Logger(NotificationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllNotifications(
    accountId: number,
    userId: number,
    page: number = 1,
    limit: number = 20,
    isRead?: boolean,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { accountId, userId };
    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    const [data, total] = await Promise.all([
      (this.prisma as any).notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).notification.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findNotificationById(id: number, accountId: number) {
    return (this.prisma as any).notification.findFirst({
      where: { id, accountId },
    });
  }

  async createNotification(data: any) {
    return (this.prisma as any).notification.create({ data });
  }

  async updateNotification(id: number, accountId: number, data: any) {
    return (this.prisma as any).notification.updateMany({
      where: { id, accountId },
      data,
    });
  }

  async markAsRead(id: number, accountId: number) {
    return (this.prisma as any).notification.updateMany({
      where: { id, accountId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async countNotifications(
    accountId: number,
    userId: number,
    isRead?: boolean,
  ) {
    const where: any = { accountId, userId };
    if (isRead !== undefined) {
      where.isRead = isRead;
    }
    return (this.prisma as any).notification.count({ where });
  }

  async findAllAnnouncements(
    accountId: number,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const where = { accountId };

    const [data, total] = await Promise.all([
      (this.prisma as any).announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      }),
      (this.prisma as any).announcement.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAnnouncementById(id: number, accountId: number) {
    return (this.prisma as any).announcement.findFirst({
      where: { id, accountId },
    });
  }

  async createAnnouncement(data: any) {
    return (this.prisma as any).announcement.create({ data });
  }

  async updateAnnouncement(id: number, accountId: number, data: any) {
    return (this.prisma as any).announcement.updateMany({
      where: { id, accountId },
      data,
    });
  }

  async deleteAnnouncement(id: number, accountId: number) {
    return (this.prisma as any).announcement.deleteMany({
      where: { id, accountId },
    });
  }

  async countAnnouncements(accountId: number) {
    return (this.prisma as any).announcement.count({
      where: { accountId },
    });
  }
}
