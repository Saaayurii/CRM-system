import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ChatRepository {
  private readonly logger = new Logger(ChatRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // --- Channels ---

  async findAllChannels(
    accountId: number,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const where = { accountId };

    const [data, total] = await Promise.all([
      (this.prisma as any).chatChannel.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          members: { include: { user: true } },
          _count: { select: { messages: true } },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            where: { isDeleted: false },
            include: { user: true },
          },
        },
      }),
      (this.prisma as any).chatChannel.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findUserChannels(userId: number) {
    return (this.prisma as any).chatChannelMember.findMany({
      where: { userId },
      select: { channelId: true },
    });
  }

  async findChannelById(id: number, accountId: number) {
    return (this.prisma as any).chatChannel.findFirst({
      where: { id, accountId },
      include: {
        members: { include: { user: true } },
        _count: { select: { messages: true } },
      },
    });
  }

  async createChannel(data: any) {
    return (this.prisma as any).chatChannel.create({
      data,
      include: {
        members: { include: { user: true } },
      },
    });
  }

  async updateChannel(id: number, accountId: number, data: any) {
    return (this.prisma as any).chatChannel.updateMany({
      where: { id, accountId },
      data,
    });
  }

  async deleteChannel(id: number, accountId: number) {
    return (this.prisma as any).chatChannel.deleteMany({
      where: { id, accountId },
    });
  }

  // --- Members ---

  async findChannelMembers(channelId: number) {
    return (this.prisma as any).chatChannelMember.findMany({
      where: { channelId },
      include: { user: true },
    });
  }

  async addChannelMember(data: any) {
    return (this.prisma as any).chatChannelMember.create({
      data,
      include: { user: true },
    });
  }

  async removeChannelMember(channelId: number, userId: number) {
    return (this.prisma as any).chatChannelMember.deleteMany({
      where: { channelId, userId },
    });
  }

  async findChannelMember(channelId: number, userId: number) {
    return (this.prisma as any).chatChannelMember.findFirst({
      where: { channelId, userId },
    });
  }

  async updateLastReadAt(channelId: number, userId: number) {
    return (this.prisma as any).chatChannelMember.updateMany({
      where: { channelId, userId },
      data: { lastReadAt: new Date() },
    });
  }

  // --- Messages ---

  async findChannelMessages(
    channelId: number,
    page: number = 1,
    limit: number = 50,
  ) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      (this.prisma as any).chatMessage.findMany({
        where: { channelId, isDeleted: false },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          replyToMessage: {
            include: { user: true },
          },
        },
      }),
      (this.prisma as any).chatMessage.count({
        where: { channelId, isDeleted: false },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findChannelMessagesCursor(
    channelId: number,
    cursor?: number,
    limit: number = 50,
  ) {
    const where: any = { channelId, isDeleted: false };
    if (cursor) {
      where.id = { lt: cursor };
    }

    const data = await (this.prisma as any).chatMessage.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        replyToMessage: {
          include: { user: true },
        },
      },
    });

    const nextCursor = data.length === limit ? data[data.length - 1].id : null;

    return { data, nextCursor };
  }

  async createMessage(data: any) {
    return (this.prisma as any).chatMessage.create({
      data,
      include: {
        user: true,
        replyToMessage: {
          include: { user: true },
        },
      },
    });
  }

  async findMessageById(id: number) {
    return (this.prisma as any).chatMessage.findFirst({
      where: { id },
      include: {
        user: true,
        channel: true,
      },
    });
  }

  async updateMessage(id: number, data: any) {
    return (this.prisma as any).chatMessage.update({
      where: { id },
      data,
      include: {
        user: true,
        replyToMessage: {
          include: { user: true },
        },
      },
    });
  }

  async deleteMessage(id: number) {
    return (this.prisma as any).chatMessage.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async getUnreadSummary(userId: number) {
    const memberships = await (this.prisma as any).chatChannelMember.findMany({
      where: { userId },
      select: { channelId: true, lastReadAt: true },
    });

    const summary: { channelId: number; unreadCount: number }[] = [];

    for (const membership of memberships) {
      const where: any = {
        channelId: membership.channelId,
        isDeleted: false,
        userId: { not: userId },
      };
      if (membership.lastReadAt) {
        where.createdAt = { gt: membership.lastReadAt };
      }

      const count = await (this.prisma as any).chatMessage.count({ where });
      summary.push({ channelId: membership.channelId, unreadCount: count });
    }

    return summary;
  }
}
