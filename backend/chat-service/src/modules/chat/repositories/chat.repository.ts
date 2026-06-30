import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ChatRepository {
  private readonly logger = new Logger(ChatRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // --- Channels ---

  async findAllChannels(
    accountId: number,
    userId: number,
    page: number = 1,
    limit: number = 20,
    projectId?: number,
    archived: boolean = false,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {
      accountId,
      members: { some: { userId, isArchived: archived } },
    };
    if (projectId) where.projectId = projectId;

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

  async findDirectChannel(accountId: number, userIdA: number, userIdB: number) {
    if (userIdA === userIdB) {
      // Self-chat: find a direct channel where the ONLY member is this user
      const candidates = await (this.prisma as any).chatChannel.findMany({
        where: {
          accountId,
          channelType: 'direct',
          members: { some: { userId: userIdA } },
        },
        include: {
          members: { include: { user: true } },
          _count: { select: { messages: true } },
        },
      });
      return candidates.find(
        (ch: any) => ch.members.length === 1 && ch.members[0].userId === userIdA,
      ) || null;
    }

    return (this.prisma as any).chatChannel.findFirst({
      where: {
        accountId,
        channelType: 'direct',
        AND: [
          { members: { some: { userId: userIdA } } },
          { members: { some: { userId: userIdB } } },
        ],
      },
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

  async updateChannelMember(channelId: number, userId: number, data: { isMuted?: boolean; isArchived?: boolean; isPinned?: boolean; pinnedAt?: Date | null; mutedUntil?: Date | null; role?: string }) {
    return (this.prisma as any).chatChannelMember.updateMany({
      where: { channelId, userId },
      data,
    });
  }

  async archiveChannel(channelId: number, userId: number, isArchived: boolean) {
    return (this.prisma as any).chatChannelMember.updateMany({
      where: { channelId, userId },
      data: { isArchived },
    });
  }

  async pinChannel(channelId: number, userId: number, isPinned: boolean) {
    return (this.prisma as any).chatChannelMember.updateMany({
      where: { channelId, userId },
      data: { isPinned, pinnedAt: isPinned ? new Date() : null },
    });
  }

  async muteChannelForUser(channelId: number, userId: number, mutedUntil: Date | null) {
    // mutedUntil = null  → unmute
    // mutedUntil = far future date → mute "forever"
    // mutedUntil = a date → temporary mute
    return (this.prisma as any).chatChannelMember.updateMany({
      where: { channelId, userId },
      data: {
        isMuted: mutedUntil !== null,
        mutedUntil,
      },
    });
  }

  async markChannelUnread(channelId: number, userId: number) {
    // Set lastReadAt to a moment BEFORE the latest message so getUnreadSummary sees >=1 unread.
    const lastMsg = await (this.prisma as any).chatMessage.findFirst({
      where: { channelId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (!lastMsg) {
      // No foreign messages — just clear lastReadAt to a long-ago timestamp
      return (this.prisma as any).chatChannelMember.updateMany({
        where: { channelId, userId },
        data: { lastReadAt: new Date(0) },
      });
    }
    const before = new Date(lastMsg.createdAt.getTime() - 1000);
    return (this.prisma as any).chatChannelMember.updateMany({
      where: { channelId, userId },
      data: { lastReadAt: before },
    });
  }

  async clearChannelHistory(channelId: number) {
    return (this.prisma as any).chatMessage.updateMany({
      where: { channelId, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async getArchivedCount(userId: number) {
    return (this.prisma as any).chatChannelMember.count({
      where: { userId, isArchived: true },
    });
  }

  /** Lean query used by notification fan-out — returns only what's needed. */
  async getChannelForNotification(channelId: number) {
    return (this.prisma as any).chatChannel.findFirst({
      where: { id: channelId },
      select: {
        name: true,
        channelType: true,
        accountId: true,
        members: { select: { userId: true, isMuted: true, mutedUntil: true } },
      },
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
    topicId?: number,
  ) {
    const where: any = { channelId, isDeleted: false };
    if (topicId) {
      where.topicId = topicId;
    }
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

  /**
   * Aggregate all attachments from messages in channels where the user is a member.
   * Filters out soft-deleted messages and tg_meta pseudo-attachments.
   */
  async findUserMediaAttachments(
    accountId: number,
    userId: number,
    page: number = 1,
    limit: number = 50,
  ) {
    const skip = (page - 1) * limit;

    // Find channel IDs the user belongs to within this account
    const channels: { id: number; name: string | null }[] = await (this.prisma as any).chatChannel.findMany({
      where: { accountId, members: { some: { userId } } },
      select: { id: true, name: true },
    });
    if (channels.length === 0) {
      return { data: [], total: 0, page, limit };
    }
    const channelIds = channels.map((c) => c.id);
    const channelNameById = new Map(channels.map((c) => [c.id, c.name] as const));

    // Fetch all non-deleted messages with non-empty attachments from these channels.
    // Prisma JSON filter "not equals [] / not null" support is limited, so we filter
    // in application code after retrieval. Volume per account is generally manageable
    // for this aggregator view; if needed, can be moved to raw SQL.
    const messages = await (this.prisma as any).chatMessage.findMany({
      where: {
        channelId: { in: channelIds },
        isDeleted: false,
        NOT: { attachments: { equals: [] } },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        channelId: true,
        userId: true,
        attachments: true,
        createdAt: true,
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Flatten into one attachment per row; skip tg_meta and empty entries
    const flat: any[] = [];
    for (const m of messages) {
      const atts = Array.isArray(m.attachments) ? m.attachments : [];
      for (const a of atts) {
        if (!a || a.type === 'tg_meta') continue;
        if (!a.fileUrl) continue;
        if (a.excludeFromMedia === true) continue;
        flat.push({
          source: 'chat',
          url: a.fileUrl,
          fileName: a.fileName || null,
          fileSize: a.fileSize || null,
          mimeType: a.mimeType || null,
          createdAt: m.createdAt,
          messageId: m.id,
          channelId: m.channelId,
          channelName: channelNameById.get(m.channelId) || null,
          userId: m.user?.id || m.userId || null,
          userName: m.user?.name || null,
          userAvatarUrl: m.user?.avatarUrl || null,
        });
      }
    }

    const total = flat.length;
    const data = flat.slice(skip, skip + limit);
    return { data, total, page, limit };
  }

  async getUnreadSummary(userId: number) {
    const memberships = await (this.prisma as any).chatChannelMember.findMany({
      where: { userId },
      select: {
        channelId: true,
        lastReadAt: true,
        channel: { select: { settings: true } },
      },
    });

    const summary: { channelId: number; unreadCount: number }[] = [];

    for (const membership of memberships) {
      // Форум-каналы: непрочитанное = сумма по темам (chat_topic_reads),
      // т.к. lastReadAt участника по каналу не двигается при чтении тем.
      const topicsEnabled = !!(membership.channel?.settings as any)?.topicsEnabled;
      if (topicsEnabled) {
        const count = await this.getForumChannelUnread(membership.channelId, userId);
        summary.push({ channelId: membership.channelId, unreadCount: count });
        continue;
      }

      const where: any = {
        channelId: membership.channelId,
        isDeleted: false,
      };
      if (membership.lastReadAt) {
        where.createdAt = { gt: membership.lastReadAt };
      }

      const count = await (this.prisma as any).chatMessage.count({ where });
      summary.push({ channelId: membership.channelId, unreadCount: count });
    }

    return summary;
  }

  // --- Topics ---

  async createTopic(data: {
    channelId: number;
    accountId: number;
    name: string;
    iconEmoji?: string;
    color?: string;
    createdByUserId?: number | null;
    isGeneral?: boolean;
    sortOrder?: number;
  }) {
    return (this.prisma as any).chatTopic.create({ data });
  }

  async findTopicById(topicId: number) {
    return (this.prisma as any).chatTopic.findFirst({
      where: { id: topicId, deletedAt: null },
    });
  }

  async findTopicsByChannel(channelId: number) {
    return (this.prisma as any).chatTopic.findMany({
      where: { channelId, deletedAt: null },
      orderBy: [
        { isPinned: 'desc' },
        { isGeneral: 'desc' },
        { lastMessageAt: 'desc' },
        { id: 'desc' },
      ],
    });
  }

  async findGeneralTopic(channelId: number) {
    return (this.prisma as any).chatTopic.findFirst({
      where: { channelId, isGeneral: true, deletedAt: null },
    });
  }

  async updateTopic(topicId: number, data: any) {
    return (this.prisma as any).chatTopic.update({
      where: { id: topicId },
      data,
    });
  }

  async softDeleteTopic(topicId: number) {
    return (this.prisma as any).chatTopic.update({
      where: { id: topicId },
      data: { deletedAt: new Date() },
    });
  }

  async bumpTopicLastMessageAt(topicId: number, when: Date) {
    return (this.prisma as any).chatTopic.update({
      where: { id: topicId },
      data: { lastMessageAt: when },
    });
  }

  /** При включении режима тем переносим все «бестемные» сообщения в General. */
  async setMessagesTopic(channelId: number, topicId: number) {
    return (this.prisma as any).chatMessage.updateMany({
      where: { channelId, topicId: null },
      data: { topicId },
    });
  }

  async markTopicRead(topicId: number, userId: number) {
    return (this.prisma as any).chatTopicRead.upsert({
      where: { topicId_userId: { topicId, userId } },
      update: { lastReadAt: new Date() },
      create: { topicId, userId, lastReadAt: new Date() },
    });
  }

  async setTopicMute(topicId: number, userId: number, mutedUntil: Date | null) {
    const isMuted = mutedUntil !== null;
    return (this.prisma as any).chatTopicRead.upsert({
      where: { topicId_userId: { topicId, userId } },
      update: { isMuted, mutedUntil },
      create: { topicId, userId, isMuted, mutedUntil },
    });
  }

  async setTopicHidden(topicId: number, userId: number, isHidden: boolean) {
    return (this.prisma as any).chatTopicRead.upsert({
      where: { topicId_userId: { topicId, userId } },
      update: { isHidden },
      create: { topicId, userId, isHidden },
    });
  }

  /** id пользователей, замьютивших тему (с учётом mutedUntil). */
  async getTopicMutedUserIds(topicId: number): Promise<number[]> {
    const now = new Date();
    const rows = await (this.prisma as any).chatTopicRead.findMany({
      where: { topicId, isMuted: true },
      select: { userId: true, mutedUntil: true },
    });
    return (rows as { userId: number; mutedUntil: Date | null }[])
      .filter((r) => !r.mutedUntil || r.mutedUntil.getTime() > now.getTime())
      .map((r) => r.userId);
  }

  // --- Per-topic pinned messages ---

  async pinMessageTopic(
    topicId: number,
    messageId: number,
    messageText: string,
    senderName: string,
  ) {
    const topic = await (this.prisma as any).chatTopic.findFirst({
      where: { id: topicId },
      select: { pinnedMessages: true },
    });
    const list: any[] = Array.isArray(topic?.pinnedMessages) ? topic.pinnedMessages : [];
    const filtered = list.filter((p: any) => p.id !== messageId);
    filtered.push({
      id: messageId,
      text: messageText,
      senderName,
      pinnedAt: new Date().toISOString(),
    });
    const updated = await (this.prisma as any).chatTopic.update({
      where: { id: topicId },
      data: { pinnedMessages: filtered },
    });
    return (updated.pinnedMessages as any[]) || [];
  }

  async unpinMessageTopic(topicId: number, messageId: number) {
    const topic = await (this.prisma as any).chatTopic.findFirst({
      where: { id: topicId },
      select: { pinnedMessages: true },
    });
    const list: any[] = Array.isArray(topic?.pinnedMessages) ? topic.pinnedMessages : [];
    const updated = await (this.prisma as any).chatTopic.update({
      where: { id: topicId },
      data: { pinnedMessages: list.filter((p: any) => p.id !== messageId) },
    });
    return (updated.pinnedMessages as any[]) || [];
  }

  /**
   * Per-user состояние каждой темы канала: непрочитанное + мут + скрытие.
   */
  async getTopicUserStates(
    channelId: number,
    userId: number,
  ): Promise<
    {
      topicId: number;
      unread: number;
      isMuted: boolean;
      mutedUntil: Date | null;
      isHidden: boolean;
    }[]
  > {
    const rows = await (this.prisma as any).$queryRawUnsafe(
      `SELECT t.id AS topic_id,
              (SELECT COUNT(*) FROM chat_messages m
                 WHERE m.topic_id = t.id AND m.is_deleted = false
                   AND (r.last_read_at IS NULL OR m.created_at > r.last_read_at)
              ) AS unread,
              COALESCE(r.is_muted, false) AS is_muted,
              r.muted_until AS muted_until,
              COALESCE(r.is_hidden, false) AS is_hidden
       FROM chat_topics t
       LEFT JOIN chat_topic_reads r ON r.topic_id = t.id AND r.user_id = $2
       WHERE t.channel_id = $1 AND t.deleted_at IS NULL`,
      channelId,
      userId,
    );
    return (rows as any[]).map((r) => ({
      topicId: Number(r.topic_id),
      unread: Number(r.unread),
      isMuted: !!r.is_muted,
      mutedUntil: r.muted_until ? new Date(r.muted_until) : null,
      isHidden: !!r.is_hidden,
    }));
  }

  async getForumChannelUnread(channelId: number, userId: number): Promise<number> {
    const rows = await (this.prisma as any).$queryRawUnsafe(
      `SELECT COALESCE(SUM(s.cnt), 0) AS total FROM (
         SELECT (SELECT COUNT(*) FROM chat_messages m
                   WHERE m.topic_id = t.id AND m.is_deleted = false
                     AND (r.last_read_at IS NULL OR m.created_at > r.last_read_at)
                ) AS cnt
         FROM chat_topics t
         LEFT JOIN chat_topic_reads r ON r.topic_id = t.id AND r.user_id = $2
         WHERE t.channel_id = $1 AND t.deleted_at IS NULL
       ) s`,
      channelId,
      userId,
    );
    return Number((rows as { total: bigint }[])[0]?.total || 0);
  }

  /** Последнее сообщение каждой темы канала (для превью в списке тем). */
  async getTopicLastMessages(channelId: number): Promise<
    {
      topicId: number;
      text: string | null;
      messageType: string;
      attachments: any;
      senderName: string | null;
      createdAt: Date;
    }[]
  > {
    const rows = await (this.prisma as any).$queryRawUnsafe(
      `SELECT DISTINCT ON (m.topic_id)
              m.topic_id, m.message_text, m.message_type, m.attachments,
              m.created_at, u.name AS sender_name
       FROM chat_messages m
       LEFT JOIN users u ON u.id = m.user_id
       WHERE m.channel_id = $1 AND m.topic_id IS NOT NULL AND m.is_deleted = false
       ORDER BY m.topic_id, m.created_at DESC`,
      channelId,
    );
    return (rows as any[]).map((r) => ({
      topicId: Number(r.topic_id),
      text: r.message_text,
      messageType: r.message_type,
      attachments: r.attachments,
      senderName: r.sender_name,
      createdAt: r.created_at,
    }));
  }

  /**
   * Fallback для «был(а) в сети»: presence в Redis эфемерный (стирается при
   * рестарте), а user_sessions.last_seen_at обновляется auth-сервисом при
   * каждой ротации refresh-токена. Таблица не входит в Prisma-схему чата.
   */
  async getLastSeenFromSessions(userIds: number[]): Promise<Record<number, Date>> {
    if (userIds.length === 0) return {};
    const rows = await (this.prisma as any).$queryRawUnsafe(
      `SELECT user_id, MAX(last_seen_at) AS last_seen
       FROM user_sessions
       WHERE user_id = ANY($1::int[])
       GROUP BY user_id`,
      userIds,
    );
    const result: Record<number, Date> = {};
    for (const row of rows as { user_id: number; last_seen: Date }[]) {
      if (row.last_seen) result[row.user_id] = new Date(row.last_seen);
    }
    return result;
  }

  // --- Pinned messages ---

  async pinMessage(channelId: number, messageId: number, messageText: string, senderName: string) {
    const channel = await (this.prisma as any).chatChannel.findFirst({
      where: { id: channelId },
      select: { settings: true },
    });
    const s = { ...((channel?.settings as any) || {}) };
    const list: any[] = s.pinnedMessages || [];
    // Убираем дубликат если уже закреплено, добавляем в конец
    const filtered = list.filter((p: any) => p.id !== messageId);
    filtered.push({ id: messageId, text: messageText, senderName, pinnedAt: new Date().toISOString() });
    s.pinnedMessages = filtered;
    // Чистим старый формат одиночного закрепления
    delete s.pinnedMessageId;
    delete s.pinnedMessageText;
    delete s.pinnedBySenderName;
    const updated = await (this.prisma as any).chatChannel.update({
      where: { id: channelId },
      data: { settings: s },
    });
    return (updated.settings as any)?.pinnedMessages as any[] || [];
  }

  async unpinMessage(channelId: number, messageId: number) {
    const channel = await (this.prisma as any).chatChannel.findFirst({
      where: { id: channelId },
      select: { settings: true },
    });
    const s = { ...((channel?.settings as any) || {}) };
    const list: any[] = s.pinnedMessages || [];
    s.pinnedMessages = list.filter((p: any) => p.id !== messageId);
    const updated = await (this.prisma as any).chatChannel.update({
      where: { id: channelId },
      data: { settings: s },
    });
    return (updated.settings as any)?.pinnedMessages as any[] || [];
  }
}
