import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ChatRepository } from './repositories/chat.repository';
import { NotificationsClientService } from './notifications-client.service';
import {
  CreateChannelDto,
  UpdateChannelDto,
  AddMemberDto,
  SendMessageDto,
  EditMessageDto,
  ReactMessageDto,
} from './dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly notificationsClient: NotificationsClientService,
  ) {}

  // --- Channels ---

  async findAllChannels(
    accountId: number,
    userId: number,
    page: number = 1,
    limit: number = 20,
    projectId?: number,
    archived: boolean = false,
  ) {
    return this.chatRepository.findAllChannels(accountId, userId, page, limit, projectId, archived);
  }

  async archiveChannel(channelId: number, userId: number, isArchived: boolean) {
    await this.chatRepository.archiveChannel(channelId, userId, isArchived);
    return { success: true };
  }

  async pinChannel(channelId: number, userId: number, isPinned: boolean) {
    const member = await this.chatRepository.findChannelMember(channelId, userId);
    if (!member) {
      throw new ForbiddenException('You are not a member of this channel');
    }
    await this.chatRepository.pinChannel(channelId, userId, isPinned);
    return { success: true, isPinned };
  }

  async muteChannelForUser(channelId: number, userId: number, mutedUntil: Date | null) {
    const member = await this.chatRepository.findChannelMember(channelId, userId);
    if (!member) {
      throw new ForbiddenException('You are not a member of this channel');
    }
    await this.chatRepository.muteChannelForUser(channelId, userId, mutedUntil);
    return { success: true, mutedUntil };
  }

  async markChannelUnread(channelId: number, userId: number) {
    const member = await this.chatRepository.findChannelMember(channelId, userId);
    if (!member) {
      throw new ForbiddenException('You are not a member of this channel');
    }
    await this.chatRepository.markChannelUnread(channelId, userId);
    return { success: true };
  }

  async clearChannelHistory(channelId: number, accountId: number, userId: number) {
    await this.findChannelById(channelId, accountId);
    const member = await this.chatRepository.findChannelMember(channelId, userId);
    if (!member) {
      throw new ForbiddenException('You are not a member of this channel');
    }
    if (member.role !== 'admin') {
      throw new ForbiddenException('Only channel admins can clear history');
    }
    await this.chatRepository.clearChannelHistory(channelId);
    return { success: true };
  }

  async getArchivedCount(userId: number) {
    const count = await this.chatRepository.getArchivedCount(userId);
    return { count };
  }

  async findChannelById(id: number, accountId: number) {
    const channel = await this.chatRepository.findChannelById(id, accountId);
    if (!channel) {
      throw new NotFoundException(`Chat channel with ID ${id} not found`);
    }
    return channel;
  }

  /**
   * Внешний вариант findChannelById: помимо проверки принадлежности к accountId
   * для клиента портала (roleId=15) обязательна membership в этом канале —
   * иначе он мог бы прочитать metadata любого канала своей компании по ID.
   */
  async findChannelByIdForUser(
    id: number,
    user: { id: number; roleId: number; accountId: number },
  ) {
    const channel = await this.findChannelById(id, user.accountId);
    if (user.roleId === 15) {
      const member = await this.chatRepository.findChannelMember(id, user.id);
      if (!member) {
        throw new ForbiddenException('Access denied');
      }
    }
    return channel;
  }

  async createChannel(
    accountId: number,
    userId: number,
    dto: CreateChannelDto,
  ) {
    // For direct channels, check if one already exists between these two users
    if (dto.channelType === 'direct') {
      const isSelfChat = !dto.memberIds || dto.memberIds.length === 0 || (dto.memberIds.length === 1 && dto.memberIds[0] === userId);
      if (isSelfChat) {
        // Self-chat ("Избранное") — check existing
        const existing = await this.chatRepository.findDirectChannel(accountId, userId, userId);
        if (existing) {
          return existing;
        }
      } else if (dto.memberIds && dto.memberIds.length === 1) {
        const otherUserId = dto.memberIds[0];
        const existing = await this.chatRepository.findDirectChannel(accountId, userId, otherUserId);
        if (existing) {
          return existing;
        }
      }
    }

    // Build members list: creator as admin + additional memberIds as members
    const memberCreates: Array<{ userId: number; role: string }> = [
      { userId, role: 'admin' },
    ];
    if (dto.memberIds && dto.memberIds.length > 0) {
      for (const memberId of dto.memberIds) {
        if (memberId !== userId) {
          memberCreates.push({ userId: memberId, role: 'member' });
        }
      }
    }

    // `avatarUrl` has no dedicated column — store it inside settings JSONB.
    const settings: Record<string, unknown> = { ...(dto.settings || {}) };
    if (dto.avatarUrl) settings.avatarUrl = dto.avatarUrl;

    const channel = await this.chatRepository.createChannel({
      accountId,
      channelType: dto.channelType,
      name: dto.name,
      description: dto.description,
      projectId: dto.projectId,
      constructionSiteId: dto.constructionSiteId,
      teamId: dto.teamId,
      createdByUserId: userId,
      isPrivate: dto.isPrivate || false,
      settings,
      members: {
        create: memberCreates,
      },
    });

    // Notify members who were added (skip direct/self chats and the creator)
    if (dto.channelType !== 'direct') {
      const addedMemberIds = memberCreates
        .map((m) => m.userId)
        .filter((id) => id !== userId);
      const channelName = dto.name || 'Новый чат';
      this.notificationsClient.sendToMany(
        addedMemberIds.map((memberId) => ({
          userId: memberId,
          accountId,
          title: `Вас добавили в чат: ${channelName}`,
          message: dto.description,
          notificationType: 'chat_channel_added',
          priority: 2,
          channels: ['in_app', 'push'],
          actionUrl: `/dashboard/chat?channelId=${channel.id}`,
          entityType: 'chat_channel',
          entityId: channel.id,
        })),
      );

      // For project channels, also surface to admins/PMs
      if (dto.projectId) {
        void this.notificationsClient.broadcast({
          accountId,
          roleIds: [1, 2, 4],
          excludeUserId: userId,
          title: `Создан чат в проекте: ${channelName}`,
          notificationType: 'chat_channel_created',
          priority: 1,
          channels: ['in_app'],
          actionUrl: `/dashboard/chat?channelId=${channel.id}`,
          entityType: 'chat_channel',
          entityId: channel.id,
        });
      }
    }

    return channel;
  }

  async importTelegram(accountId: number, userId: number, body: any) {
    const { name, type, telegramId, messages = [] } = body;

    // Create a group channel tagged as TG import
    const channel = await this.chatRepository.createChannel({
      accountId,
      channelType: 'group',
      name: `[TG] ${name || 'Диалог'}`,
      createdByUserId: userId,
      isPrivate: false,
      settings: { telegramImport: true, telegramId, telegramType: type },
      members: { create: [{ userId, role: 'admin' }] },
    });

    // Bulk-insert messages in chunks to avoid timeouts
    const CHUNK = 100;
    for (let i = 0; i < messages.length; i += CHUNK) {
      const chunk = messages.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map((m: any) => {
          const senderPrefix = m.from && m.from !== 'Неизвестно' ? `**${m.from}:** ` : '';
          const text = `${senderPrefix}${m.text || ''}`.trim();
          if (!text) return null;
          return this.chatRepository.createMessage({
            channelId: channel.id,
            userId,
            messageText: text,
            messageType: 'text',
            attachments: [{ type: 'tg_meta', from: m.from, fromId: m.fromId, tgDate: m.date, mediaType: m.mediaType, forwardedFrom: m.forwardedFrom }],
            createdAt: m.date ? new Date(m.date) : undefined,
          });
        }).filter(Boolean),
      );
    }

    return { channelId: channel.id, name: channel.name, imported: messages.length };
  }

  async updateChannel(id: number, accountId: number, dto: UpdateChannelDto) {
    const existing = await this.findChannelById(id, accountId);

    // `avatarUrl` has no dedicated column — it lives in the settings JSONB.
    const { avatarUrl, settings, ...rest } = dto;
    const data: any = { ...rest };
    if (avatarUrl !== undefined || settings !== undefined) {
      data.settings = {
        ...((existing.settings as Record<string, unknown>) || {}),
        ...((settings as Record<string, unknown>) || {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      };
    }

    await this.chatRepository.updateChannel(id, accountId, data);
    return this.findChannelById(id, accountId);
  }

  async deleteChannel(id: number, accountId: number) {
    await this.findChannelById(id, accountId);
    await this.chatRepository.deleteChannel(id, accountId);
    return { message: `Chat channel with ID ${id} deleted successfully` };
  }

  // --- Members ---

  async findChannelMembers(channelId: number, accountId: number) {
    await this.findChannelById(channelId, accountId);
    return this.chatRepository.findChannelMembers(channelId);
  }

  async addChannelMember(
    channelId: number,
    accountId: number,
    dto: AddMemberDto,
  ) {
    await this.findChannelById(channelId, accountId);

    const existingMember = await this.chatRepository.findChannelMember(
      channelId,
      dto.userId,
    );
    if (existingMember) {
      throw new ConflictException(
        `User ${dto.userId} is already a member of this channel`,
      );
    }

    return this.chatRepository.addChannelMember({
      channelId,
      userId: dto.userId,
      role: dto.role,
    });
  }

  async removeChannelMember(
    channelId: number,
    accountId: number,
    userId: number,
  ) {
    await this.findChannelById(channelId, accountId);
    await this.chatRepository.removeChannelMember(channelId, userId);
    return { message: `User ${userId} removed from channel ${channelId}` };
  }

  // --- Messages ---

  async findChannelMessages(
    channelId: number,
    accountId: number,
    page: number = 1,
    limit: number = 50,
  ) {
    await this.findChannelById(channelId, accountId);
    return this.chatRepository.findChannelMessages(channelId, page, limit);
  }

  async findChannelMessagesCursor(
    channelId: number,
    user: { id: number; roleId: number; accountId: number },
    cursor?: number,
    limit: number = 50,
  ) {
    await this.findChannelById(channelId, user.accountId);
    if (user.roleId === 15) {
      const member = await this.chatRepository.findChannelMember(channelId, user.id);
      if (!member) {
        throw new ForbiddenException('Access denied');
      }
    }
    return this.chatRepository.findChannelMessagesCursor(
      channelId,
      cursor,
      limit,
    );
  }

  async muteChannelMember(
    channelId: number,
    accountId: number,
    requestingUserId: number,
    targetUserId: number,
    isMuted: boolean,
  ) {
    await this.findChannelById(channelId, accountId);
    const requester = await this.chatRepository.findChannelMember(channelId, requestingUserId);
    if (!requester || requester.role !== 'admin') {
      throw new ForbiddenException('Only channel admins can mute members');
    }
    return this.chatRepository.updateChannelMember(channelId, targetUserId, { isMuted });
  }

  async createMessage(
    channelId: number,
    accountId: number,
    userId: number,
    dto: SendMessageDto,
  ) {
    await this.findChannelById(channelId, accountId);

    const member = await this.chatRepository.findChannelMember(channelId, userId);
    if (member?.isMuted) {
      throw new ForbiddenException('You are restricted from sending messages in this channel');
    }

    return this.chatRepository.createMessage({
      channelId,
      userId,
      messageText: dto.messageText,
      messageType: dto.messageType || 'text',
      attachments: dto.attachments || [],
      replyToMessageId: dto.replyToMessageId,
    });
  }

  /** Returns channel meta + member IDs needed for push notification fan-out. */
  async getChannelForNotification(channelId: number) {
    return this.chatRepository.getChannelForNotification(channelId);
  }

  async editMessage(messageId: number, userId: number, dto: EditMessageDto) {
    const message = await this.chatRepository.findMessageById(messageId);
    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }
    if (message.userId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    return this.chatRepository.updateMessage(messageId, {
      messageText: dto.messageText,
      isEdited: true,
      editedAt: new Date(),
    });
  }

  /**
   * Исчезающие медиа: получатель досмотрел вложение с ttl — вложение «сгорает»
   * для всех (fileUrl затирается, ставится burned/burnedAt). Возвращает исходный
   * fileUrl, чтобы api-gateway удалил физический файл со своего тома.
   * Сопоставление по имени файла: клиент может прислать нормализованный URL.
   */
  async burnMedia(
    messageId: number,
    userId: number,
    fileUrl: string,
  ): Promise<{
    burned: boolean;
    channelId: number;
    messageId: number;
    fileUrl?: string;
  }> {
    const message = await this.chatRepository.findMessageById(messageId);
    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }
    const channelId = Number(message.channelId);
    const member = await this.chatRepository.findChannelMember(
      channelId,
      userId,
    );
    if (!member) {
      throw new ForbiddenException('You are not a member of this channel');
    }

    const fileName = (fileUrl || '').split('/').pop();
    if (!fileName) {
      throw new BadRequestException('fileUrl is required');
    }
    const attachments: any[] = Array.isArray(message.attachments)
      ? message.attachments
      : [];
    const target = attachments.find(
      (a) =>
        a &&
        a.ttl &&
        !a.burned &&
        typeof a.fileUrl === 'string' &&
        a.fileUrl.split('/').pop() === fileName,
    );
    if (!target) {
      // уже сгорело или вложение не исчезающее — идемпотентный no-op
      return { burned: false, channelId, messageId };
    }

    const originalFileUrl = String(target.fileUrl);
    const updatedAttachments = attachments.map((a) =>
      a === target
        ? { ...a, burned: true, burnedAt: new Date().toISOString(), fileUrl: '' }
        : a,
    );
    await this.chatRepository.updateMessage(messageId, {
      attachments: updatedAttachments,
    });
    return {
      burned: true,
      channelId,
      messageId,
      fileUrl: originalFileUrl,
    };
  }

  async deleteMessage(messageId: number, userId: number) {
    const message = await this.chatRepository.findMessageById(messageId);
    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }
    if (message.userId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.chatRepository.deleteMessage(messageId);
    return { message: `Message ${messageId} deleted` };
  }

  async reactToMessage(
    messageId: number,
    userId: number,
    dto: ReactMessageDto,
  ) {
    const message = await this.chatRepository.findMessageById(messageId);
    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    const reactions: Record<string, number[]> = message.reactions || {};
    const userIdStr = userId;

    if (reactions[dto.reaction]?.includes(userIdStr)) {
      reactions[dto.reaction] = reactions[dto.reaction].filter(
        (id) => id !== userIdStr,
      );
      if (reactions[dto.reaction].length === 0) {
        delete reactions[dto.reaction];
      }
    } else {
      if (!reactions[dto.reaction]) {
        reactions[dto.reaction] = [];
      }
      reactions[dto.reaction].push(userIdStr);
    }

    return this.chatRepository.updateMessage(messageId, { reactions });
  }

  async markAsRead(channelId: number, userId: number) {
    await this.chatRepository.updateLastReadAt(channelId, userId);
    // Канал прочитан — гасим в колокольчике всю пачку уведомлений о его
    // сообщениях (fire-and-forget, SSE notification_deleted обновит фронт)
    void this.notificationsClient.clearChatChannelNotifications(userId, channelId);
    return { channelId, lastReadAt: new Date() };
  }

  async getUnreadSummary(userId: number) {
    return this.chatRepository.getUnreadSummary(userId);
  }

  async getLastSeenFromSessions(userIds: number[]): Promise<Record<number, Date>> {
    return this.chatRepository.getLastSeenFromSessions(userIds);
  }

  async findUserMediaAttachments(
    accountId: number,
    userId: number,
    page: number = 1,
    limit: number = 50,
  ) {
    return this.chatRepository.findUserMediaAttachments(accountId, userId, page, limit);
  }

  async getUserChannelIds(userId: number): Promise<number[]> {
    const memberships = await this.chatRepository.findUserChannels(userId);
    return memberships.map((m: any) => m.channelId);
  }

  // --- Pinned messages ---

  async pinMessage(
    channelId: number,
    messageId: number,
    messageText: string,
    senderName: string,
    accountId: number,
    pinnerName: string,
  ) {
    const channel = await this.chatRepository.findChannelById(channelId, accountId);
    if (!channel) throw new NotFoundException('Channel not found');
    const pinnedMessages = await this.chatRepository.pinMessage(channelId, messageId, messageText, senderName);
    const systemMessage = await this.chatRepository.createMessage({
      channelId,
      userId: null,
      messageText: `📌 ${pinnerName} закрепил сообщение`,
      messageType: 'system',
      attachments: [],
    });
    return { pinnedMessages, systemMessage };
  }

  async unpinMessage(channelId: number, messageId: number, accountId: number, pinnerName: string) {
    const channel = await this.chatRepository.findChannelById(channelId, accountId);
    if (!channel) throw new NotFoundException('Channel not found');
    const pinnedMessages = await this.chatRepository.unpinMessage(channelId, messageId);
    const systemMessage = await this.chatRepository.createMessage({
      channelId,
      userId: null,
      messageText: `🔓 ${pinnerName} открепил сообщение`,
      messageType: 'system',
      attachments: [],
    });
    return { pinnedMessages, systemMessage };
  }
}
