import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ChatRepository } from './repositories/chat.repository';
import { NotificationsClientService } from './notifications-client.service';
import {
  TG_IMPORT_QUEUE,
  TG_IMPORT_JOB_CHUNK,
  TG_IMPORT_CHUNK,
  TelegramImportChunkJob,
} from './queues/telegram-import.constants';
import {
  CHANNEL_EVENTS_QUEUE,
  CHANNEL_EVENT_JOB,
  ChannelEventJob,
} from './queues/channel-events.constants';
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
    @InjectQueue(TG_IMPORT_QUEUE) private readonly tgImportQueue: Queue,
    @InjectQueue(CHANNEL_EVENTS_QUEUE) private readonly channelEventsQueue: Queue,
  ) {}

  // --- Роли и права ---

  /** Владелец канала (единственный, role='owner'). */
  private isOwner(member: { role?: string | null } | null | undefined): boolean {
    return member?.role === 'owner';
  }

  /** Управляющий: владелец или админ — обходит гранулярные права. */
  private isManager(member: { role?: string | null } | null | undefined): boolean {
    return member?.role === 'owner' || member?.role === 'admin';
  }

  /**
   * Может ли участник выполнить действие `key` в канале (и, опционально, в теме).
   * Владелец/админ — всегда да. Иначе: право канала (settings.permissions,
   * дефолт true) И персональный оверрайд участника (permissions[key] !== false).
   * Для ключей отправки дополнительно учитывается право темы (postPermission).
   */
  private can(
    channel: { settings?: unknown } | null | undefined,
    member: { role?: string | null; permissions?: unknown } | null | undefined,
    key:
      | 'sendMessages'
      | 'sendMedia'
      | 'sendFiles'
      | 'sendVoice'
      | 'addReactions'
      | 'pinMessages'
      | 'changeInfo'
      | 'inviteUsers'
      | 'createTopics',
    topic?: { postPermission?: string | null } | null,
  ): boolean {
    if (!member) return false;
    if (this.isManager(member)) return true;
    const channelPerms =
      ((channel?.settings as Record<string, unknown>)?.permissions as
        | Record<string, unknown>
        | undefined) || {};
    if (channelPerms[key] === false) return false;
    const memberPerms = (member.permissions as Record<string, unknown> | null) || null;
    if (memberPerms && memberPerms[key] === false) return false;
    const isPosting =
      key === 'sendMessages' ||
      key === 'sendMedia' ||
      key === 'sendFiles' ||
      key === 'sendVoice';
    if (isPosting && topic && topic.postPermission === 'admins') return false;
    return true;
  }

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
    if (!this.isManager(member)) {
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
    // super_admin (1) и admin (2) могут читать метаданные канала без членства
    if (user.roleId !== 1 && user.roleId !== 2) {
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

    // Build members list: creator as owner + additional memberIds as members
    const memberCreates: Array<{ userId: number; role: string }> = [
      { userId, role: 'owner' },
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

    // Create the channel synchronously so the caller gets a usable channelId
    // immediately; messages can be large (thousands), so insert them in the
    // background via BullMQ instead of blocking the request until the end.
    const channel = await this.chatRepository.createChannel({
      accountId,
      channelType: 'group',
      name: `[TG] ${name || 'Диалог'}`,
      createdByUserId: userId,
      isPrivate: false,
      settings: { telegramImport: true, telegramId, telegramType: type },
      members: { create: [{ userId, role: 'owner' }] },
    });

    // Enqueue one job per chunk so message inserts run off the request thread,
    // with retries. If the queue is unavailable, fall back to inline insertion.
    let queued = false;
    try {
      for (let i = 0; i < messages.length; i += TG_IMPORT_CHUNK) {
        const job: TelegramImportChunkJob = {
          channelId: channel.id,
          userId,
          messages: messages.slice(i, i + TG_IMPORT_CHUNK),
        };
        await this.tgImportQueue.add(TG_IMPORT_JOB_CHUNK, job);
      }
      queued = true;
    } catch (err) {
      this.logger.warn(
        `TG import queue unavailable, inserting inline: ${(err as Error).message}`,
      );
    }

    if (!queued) {
      for (let i = 0; i < messages.length; i += TG_IMPORT_CHUNK) {
        await this.insertTelegramMessages(
          channel.id,
          userId,
          messages.slice(i, i + TG_IMPORT_CHUNK),
        );
      }
    }

    return { channelId: channel.id, name: channel.name, imported: messages.length };
  }

  /** Insert one chunk of Telegram-export messages. Used by the queue processor and the inline fallback. */
  async insertTelegramMessages(channelId: number, userId: number, messages: any[]): Promise<void> {
    await Promise.all(
      messages
        .map((m: any) => {
          const senderPrefix = m.from && m.from !== 'Неизвестно' ? `**${m.from}:** ` : '';
          const text = `${senderPrefix}${m.text || ''}`.trim();
          if (!text) return null;
          return this.chatRepository.createMessage({
            channelId,
            userId,
            messageText: text,
            messageType: 'text',
            attachments: [{ type: 'tg_meta', from: m.from, fromId: m.fromId, tgDate: m.date, mediaType: m.mediaType, forwardedFrom: m.forwardedFrom }],
            createdAt: m.date ? new Date(m.date) : undefined,
          });
        })
        .filter(Boolean),
    );
  }

  /**
   * Журналирование действия админа канала (для «Недавних действий»).
   * Кладём задачу в очередь `channel-events` (воркер пишет в БД с ретраями и
   * публикует событие в Kafka `audit.events`). Если очередь/Redis недоступны —
   * пишем инлайн (fire-and-forget), чтобы не потерять запись. Никогда не бросает.
   */
  private logChannelEvent(
    channelId: number,
    accountId: number,
    actorUserId: number | null,
    action: string,
    meta: Record<string, unknown> = {},
  ): void {
    const job: ChannelEventJob = { channelId, accountId, actorUserId, action, meta };
    void this.channelEventsQueue
      .add(CHANNEL_EVENT_JOB, job, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 200,
      })
      .catch(() => {
        // Очередь/Redis недоступны — инлайн-фолбэк, ошибку глушим.
        void this.chatRepository
          .insertChannelEvent(channelId, accountId, actorUserId, action, meta)
          .catch(() => undefined);
      });
  }

  async updateChannel(
    id: number,
    accountId: number,
    dto: UpdateChannelDto,
    actorUserId?: number,
  ) {
    const existing = await this.findChannelById(id, accountId);
    const prevSettings = (existing.settings as Record<string, unknown>) || {};

    // Авторизация (для внутренних вызовов без actorUserId — пропускаем).
    // Управляющие ключи (права/скрытие участников/история/режим тем) — только
    // владелец/админ. Профиль группы (имя/описание/аватар/тип/оформление) —
    // управляющий ИЛИ участник с правом changeInfo.
    if (actorUserId != null) {
      const actor = await this.chatRepository.findChannelMember(id, actorUserId);
      const incomingSettings = (dto.settings as Record<string, unknown>) || {};
      const MANAGEMENT_KEYS = [
        'permissions',
        'hideMembers',
        'historyVisibleToNewMembers',
        'topicsEnabled',
        'createTopicsPermission',
      ];
      const touchesManagement = MANAGEMENT_KEYS.some((k) => k in incomingSettings);
      if (touchesManagement && !this.isManager(actor)) {
        throw new ForbiddenException('Only channel admins can change these settings');
      }
      const touchesInfo =
        dto.name !== undefined ||
        dto.description !== undefined ||
        dto.isPrivate !== undefined ||
        dto.avatarUrl !== undefined ||
        Object.keys(incomingSettings).some((k) => !MANAGEMENT_KEYS.includes(k));
      if (touchesInfo && !this.can(existing, actor, 'changeInfo')) {
        throw new ForbiddenException('You are not allowed to change group info');
      }
    }

    // `avatarUrl` has no dedicated column — it lives in the settings JSONB.
    const { avatarUrl, settings, ...rest } = dto;
    const data: any = { ...rest };
    if (avatarUrl !== undefined || settings !== undefined) {
      data.settings = {
        ...prevSettings,
        ...((settings as Record<string, unknown>) || {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      };
    }

    await this.chatRepository.updateChannel(id, accountId, data);

    // Какие поля реально изменились — для «Недавних действий».
    const fields: string[] = [];
    if (dto.name !== undefined && dto.name !== existing.name) fields.push('name');
    if (dto.description !== undefined && dto.description !== (existing as any).description)
      fields.push('description');
    if (dto.isPrivate !== undefined && dto.isPrivate !== (existing as any).isPrivate)
      fields.push('type');
    if (avatarUrl !== undefined) fields.push('avatar');
    const s = (settings as Record<string, unknown>) || {};
    for (const key of [
      'profileColor',
      'wallpaper',
      'backgroundEmoji',
      'emojiStatus',
      'reactionsMode',
      'historyVisibleToNewMembers',
      'hideMembers',
      'permissions',
    ]) {
      if (key in s && JSON.stringify(s[key]) !== JSON.stringify(prevSettings[key])) {
        fields.push(key);
      }
    }
    if (fields.length > 0 && actorUserId != null) {
      this.logChannelEvent(id, accountId, actorUserId, 'channel.update', {
        fields,
        ...(fields.includes('name') ? { name: dto.name } : {}),
      });
    }

    return this.findChannelById(id, accountId);
  }

  /** «Недавние действия»: журнал действий админов канала (только для участников). */
  async getRecentActions(
    channelId: number,
    user: { id: number; roleId: number; accountId: number },
  ) {
    await this.findChannelByIdForUser(channelId, user);
    return this.chatRepository.getChannelEvents(channelId, 100);
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
    actorUserId?: number,
  ) {
    const channel = await this.findChannelById(channelId, accountId);

    // Приглашение участников — по праву inviteUsers (владелец/админ обходят).
    // actorUserId отсутствует у внутренних вызовов (создание канала и т.п.) —
    // тогда проверку пропускаем.
    if (actorUserId != null) {
      const actor = await this.chatRepository.findChannelMember(channelId, actorUserId);
      if (!this.can(channel, actor, 'inviteUsers')) {
        throw new ForbiddenException('You are not allowed to add members here');
      }
    }

    const existingMember = await this.chatRepository.findChannelMember(
      channelId,
      dto.userId,
    );
    if (existingMember) {
      throw new ConflictException(
        `User ${dto.userId} is already a member of this channel`,
      );
    }

    const result = await this.chatRepository.addChannelMember({
      channelId,
      userId: dto.userId,
      role: dto.role,
    });
    this.logChannelEvent(channelId, accountId, actorUserId ?? null, 'member.add', {
      targetUserId: dto.userId,
      ...(dto.role ? { role: dto.role } : {}),
    });
    return result;
  }

  async removeChannelMember(
    channelId: number,
    accountId: number,
    userId: number,
    actorUserId?: number,
  ) {
    await this.findChannelById(channelId, accountId);

    const target = await this.chatRepository.findChannelMember(channelId, userId);
    // Владельца удалить нельзя (сначала передать владение)
    if (this.isOwner(target)) {
      throw new ForbiddenException('The owner cannot be removed; transfer ownership first');
    }
    // Удаление другого участника — только управляющий; админ не может удалить
    // другого админа (только владелец). Самовыход разрешён всем.
    if (actorUserId != null && actorUserId !== userId) {
      const actor = await this.chatRepository.findChannelMember(channelId, actorUserId);
      if (!this.isManager(actor)) {
        throw new ForbiddenException('You are not allowed to remove members');
      }
      if (this.isManager(target) && !this.isOwner(actor)) {
        throw new ForbiddenException('Only the owner can remove admins');
      }
    }

    await this.chatRepository.removeChannelMember(channelId, userId);
    this.logChannelEvent(channelId, accountId, actorUserId ?? null, 'member.remove', {
      targetUserId: userId,
    });
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
    topicId?: number,
  ) {
    const channel = await this.findChannelById(channelId, user.accountId);
    const member = (channel.members || []).find((m: any) => m.userId === user.id);
    if (!member) {
      throw new ForbiddenException('Access denied');
    }

    // «История чата для новых участников = Скрыта»: не-админ/не-создатель видит
    // сообщения только с момента вступления (как в Telegram). Создатель и админы
    // канала видят полную историю.
    let sinceDate: Date | undefined;
    const settings = (channel.settings as Record<string, unknown>) || {};
    if (
      settings.historyVisibleToNewMembers === false &&
      member &&
      !this.isManager(member) &&
      channel.createdByUserId !== user.id &&
      member.joinedAt
    ) {
      sinceDate = new Date(member.joinedAt);
    }

    return this.chatRepository.findChannelMessagesCursor(
      channelId,
      cursor,
      limit,
      topicId,
      sinceDate,
    );
  }

  /**
   * Изменение параметров участника: заглушение, роль (admin/member) и
   * персональные ограничения. Права:
   *  - действовать может только управляющий (владелец/админ);
   *  - нельзя трогать владельца, и админ не может трогать других админов;
   *  - менять роль (назначать/снимать админа) может ТОЛЬКО владелец;
   *  - роль 'owner' через этот метод не выдаётся (только передача владения).
   */
  async updateMemberSettings(
    channelId: number,
    accountId: number,
    requestingUserId: number,
    targetUserId: number,
    changes: { isMuted?: boolean; role?: string; permissions?: unknown },
  ) {
    await this.findChannelById(channelId, accountId);
    const requester = await this.chatRepository.findChannelMember(channelId, requestingUserId);
    if (!this.isManager(requester)) {
      throw new ForbiddenException('Only channel admins can manage members');
    }
    const target = await this.chatRepository.findChannelMember(channelId, targetUserId);
    if (!target) {
      throw new NotFoundException('Member not found');
    }
    // Владельца трогать нельзя; админ не может модерировать другого админа
    if (this.isOwner(target)) {
      throw new ForbiddenException('The owner cannot be modified');
    }
    if (this.isManager(target) && !this.isOwner(requester)) {
      throw new ForbiddenException('Only the owner can manage admins');
    }

    const data: { isMuted?: boolean; role?: string; permissions?: unknown } = {};

    if (changes.role !== undefined) {
      if (!this.isOwner(requester)) {
        throw new ForbiddenException('Only the owner can change roles');
      }
      if (changes.role !== 'admin' && changes.role !== 'member') {
        throw new BadRequestException('Role must be "admin" or "member"');
      }
      data.role = changes.role;
    }
    if (changes.isMuted !== undefined) data.isMuted = changes.isMuted;
    if (changes.permissions !== undefined) {
      // null очищает персональные ограничения (наследование прав канала)
      data.permissions = changes.permissions;
    }

    if (Object.keys(data).length === 0) {
      return { success: true };
    }

    const result = await this.chatRepository.updateChannelMember(channelId, targetUserId, data);
    if (data.role !== undefined) {
      this.logChannelEvent(channelId, accountId, requestingUserId, 'member.role', {
        targetUserId,
        role: data.role,
      });
    }
    if (data.isMuted !== undefined) {
      this.logChannelEvent(channelId, accountId, requestingUserId, 'member.mute', {
        targetUserId,
        isMuted: data.isMuted,
      });
    }
    if (data.permissions !== undefined) {
      this.logChannelEvent(channelId, accountId, requestingUserId, 'member.restrict', {
        targetUserId,
      });
    }
    return result;
  }

  /** Передача владения каналом: только текущий владелец может передать. */
  async transferOwnership(
    channelId: number,
    accountId: number,
    requestingUserId: number,
    targetUserId: number,
  ) {
    await this.findChannelById(channelId, accountId);
    const requester = await this.chatRepository.findChannelMember(channelId, requestingUserId);
    if (!this.isOwner(requester)) {
      throw new ForbiddenException('Only the owner can transfer ownership');
    }
    if (targetUserId === requestingUserId) {
      throw new BadRequestException('You are already the owner');
    }
    const target = await this.chatRepository.findChannelMember(channelId, targetUserId);
    if (!target) {
      throw new NotFoundException('Member not found');
    }
    await this.chatRepository.transferOwnership(channelId, requestingUserId, targetUserId);
    this.logChannelEvent(channelId, accountId, requestingUserId, 'owner.transfer', {
      targetUserId,
    });
    return { success: true, ownerId: targetUserId };
  }

  async createMessage(
    channelId: number,
    accountId: number,
    userId: number,
    dto: SendMessageDto,
  ) {
    const channel = await this.findChannelById(channelId, accountId);

    const member = await this.chatRepository.findChannelMember(channelId, userId);
    if (member?.isMuted) {
      throw new ForbiddenException('You are restricted from sending messages in this channel');
    }

    // Форум-каналы: каждое сообщение принадлежит теме. Без topicId — пишем в
    // General. Валидируем принадлежность теме и закрытость (в закрытую тему
    // пишут только владелец/админы канала).
    let topicId: number | null = null;
    let resolvedTopic: { postPermission?: string | null; allowedUserIds?: unknown } | null = null;
    const settings = (channel.settings as Record<string, unknown>) || {};
    if (settings.topicsEnabled) {
      let resolved = dto.topicId
        ? await this.chatRepository.findTopicById(dto.topicId)
        : await this.chatRepository.findGeneralTopic(channelId);
      if (!resolved) {
        // На всякий случай (включили режим, но General отсутствует) — создаём.
        resolved = await this.ensureGeneralTopic(channelId, accountId);
      }
      if (resolved.channelId !== channelId) {
        throw new BadRequestException('Topic does not belong to this channel');
      }
      if (resolved.isClosed && !this.isManager(member)) {
        throw new ForbiddenException('This topic is closed');
      }
      topicId = resolved.id;
      resolvedTopic = resolved;
    }

    // Гранулярные права участника (владелец/админ обходят). Базовое право на
    // отправку + отдельные права по типу вложения + право темы (postPermission).
    if (!this.isManager(member)) {
      // Поимённый доступ к теме: писать могут только перечисленные пользователи
      if (resolvedTopic?.postPermission === 'custom') {
        const allowed = Array.isArray(resolvedTopic.allowedUserIds)
          ? (resolvedTopic.allowedUserIds as unknown[]).map(Number)
          : [];
        if (!allowed.includes(userId)) {
          throw new ForbiddenException('You are not allowed to post in this topic');
        }
      }
      if (!this.can(channel, member, 'sendMessages', resolvedTopic)) {
        throw new ForbiddenException('You are not allowed to send messages here');
      }
      const atts: any[] = Array.isArray(dto.attachments) ? dto.attachments : [];
      const isVoiceMsg = dto.messageType === 'voice' || dto.messageType === 'video_note';
      const hasMedia = atts.some((a) => {
        const m: string = a?.mimeType || '';
        const n: string = a?.fileName || '';
        return m.startsWith('image/') || m.startsWith('video/') ||
          (!m && /\.(jpe?g|png|gif|webp|bmp|heic|avif|mp4|mov|webm|mkv|m4v)$/i.test(n));
      });
      const hasOtherFile = atts.some((a) => {
        const m: string = a?.mimeType || '';
        return !(m.startsWith('image/') || m.startsWith('video/') || m.startsWith('audio/'));
      });
      if (isVoiceMsg && !this.can(channel, member, 'sendVoice', resolvedTopic)) {
        throw new ForbiddenException('You are not allowed to send voice messages here');
      }
      if (!isVoiceMsg && hasMedia && !this.can(channel, member, 'sendMedia', resolvedTopic)) {
        throw new ForbiddenException('You are not allowed to send media here');
      }
      if (!isVoiceMsg && !hasMedia && hasOtherFile &&
        !this.can(channel, member, 'sendFiles', resolvedTopic)) {
        throw new ForbiddenException('You are not allowed to send files here');
      }
    }

    const message = await this.chatRepository.createMessage({
      channelId,
      topicId,
      userId,
      messageText: dto.messageText,
      messageType: dto.messageType || 'text',
      attachments: dto.attachments || [],
      replyToMessageId: dto.replyToMessageId,
    });

    if (topicId) {
      await this.chatRepository.bumpTopicLastMessageAt(topicId, message.createdAt);
    }

    return message;
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
    accountId: number,
    dto: ReactMessageDto,
  ) {
    const message = await this.chatRepository.findMessageById(messageId);
    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    // Реакции — по праву addReactions (владелец/админ обходят). Заодно требуем
    // членство: реагировать может только участник канала.
    const channel = await this.chatRepository.findChannelById(
      Number(message.channelId),
      accountId,
    );
    const member = await this.chatRepository.findChannelMember(
      Number(message.channelId),
      userId,
    );
    if (!member) {
      throw new ForbiddenException('You are not a member of this channel');
    }
    if (!this.can(channel, member, 'addReactions')) {
      throw new ForbiddenException('You are not allowed to add reactions here');
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
    userId: number,
    pinnerName: string,
    topicId?: number,
  ) {
    const channel = await this.chatRepository.findChannelById(channelId, accountId);
    if (!channel) throw new NotFoundException('Channel not found');
    const pinner = await this.chatRepository.findChannelMember(channelId, userId);
    if (!this.can(channel, pinner, 'pinMessages')) {
      throw new ForbiddenException('You are not allowed to pin messages here');
    }
    // В форум-канале закреп у каждой темы свой; иначе — на канал
    const pinnedMessages = topicId
      ? await this.chatRepository.pinMessageTopic(topicId, messageId, messageText, senderName)
      : await this.chatRepository.pinMessage(channelId, messageId, messageText, senderName);
    const systemMessage = await this.chatRepository.createMessage({
      channelId,
      topicId: topicId ?? null,
      userId: null,
      messageText: `📌 ${pinnerName} закрепил сообщение`,
      messageType: 'system',
      attachments: [],
    });
    return { pinnedMessages, systemMessage, topicId: topicId ?? null };
  }

  async unpinMessage(
    channelId: number,
    messageId: number,
    accountId: number,
    userId: number,
    pinnerName: string,
    topicId?: number,
  ) {
    const channel = await this.chatRepository.findChannelById(channelId, accountId);
    if (!channel) throw new NotFoundException('Channel not found');
    const pinner = await this.chatRepository.findChannelMember(channelId, userId);
    if (!this.can(channel, pinner, 'pinMessages')) {
      throw new ForbiddenException('You are not allowed to unpin messages here');
    }
    const pinnedMessages = topicId
      ? await this.chatRepository.unpinMessageTopic(topicId, messageId)
      : await this.chatRepository.unpinMessage(channelId, messageId);
    const systemMessage = await this.chatRepository.createMessage({
      channelId,
      topicId: topicId ?? null,
      userId: null,
      messageText: `🔓 ${pinnerName} открепил сообщение`,
      messageType: 'system',
      attachments: [],
    });
    return { pinnedMessages, systemMessage, topicId: topicId ?? null };
  }

  // --- Topics (Telegram-style forum topics) ---

  private async assertMember(channelId: number, userId: number) {
    const member = await this.chatRepository.findChannelMember(channelId, userId);
    if (!member) {
      throw new ForbiddenException('You are not a member of this channel');
    }
    return member;
  }

  /** Создаёт «Общее» (General), если её ещё нет в канале. */
  async ensureGeneralTopic(channelId: number, accountId: number) {
    const existing = await this.chatRepository.findGeneralTopic(channelId);
    if (existing) return existing;
    return this.chatRepository.createTopic({
      channelId,
      accountId,
      name: 'Общее',
      iconEmoji: '💬',
      color: '#64748b',
      isGeneral: true,
      sortOrder: -1,
    });
  }

  /** Список тем форум-канала с непрочитанным и превью последнего сообщения. */
  async listTopics(
    channelId: number,
    user: { id: number; roleId: number; accountId: number },
  ) {
    await this.findChannelByIdForUser(channelId, user);
    const [topics, states, lastMsgs] = await Promise.all([
      this.chatRepository.findTopicsByChannel(channelId),
      this.chatRepository.getTopicUserStates(channelId, user.id),
      this.chatRepository.getTopicLastMessages(channelId),
    ]);
    const stateById = new Map(states.map((s) => [s.topicId, s]));
    const lastById = new Map(lastMsgs.map((m) => [m.topicId, m]));
    return topics.map((t: any) => {
      const st = stateById.get(t.id);
      return {
        ...t,
        unreadCount: st?.unread ?? 0,
        isMutedForMe: st?.isMuted ?? false,
        mutedUntil: st?.mutedUntil ?? null,
        isHiddenForMe: st?.isHidden ?? false,
        lastMessage: lastById.get(t.id) ?? null,
      };
    });
  }

  async muteTopic(
    channelId: number,
    userId: number,
    topicId: number,
    mutedUntil: Date | null,
  ) {
    const topic = await this.chatRepository.findTopicById(topicId);
    if (!topic || topic.channelId !== channelId) {
      throw new NotFoundException('Topic not found');
    }
    await this.assertMember(channelId, userId);
    await this.chatRepository.setTopicMute(topicId, userId, mutedUntil);
    return { success: true, topicId, mutedUntil };
  }

  async hideTopic(
    channelId: number,
    userId: number,
    topicId: number,
    hidden: boolean,
  ) {
    const topic = await this.chatRepository.findTopicById(topicId);
    if (!topic || topic.channelId !== channelId) {
      throw new NotFoundException('Topic not found');
    }
    await this.assertMember(channelId, userId);
    await this.chatRepository.setTopicHidden(topicId, userId, hidden);
    return { success: true, topicId, hidden };
  }

  async createTopic(
    channelId: number,
    accountId: number,
    userId: number,
    dto: { name: string; iconEmoji?: string; color?: string },
  ) {
    const channel = await this.findChannelById(channelId, accountId);
    const settings = (channel.settings as Record<string, unknown>) || {};
    if (!settings.topicsEnabled) {
      throw new BadRequestException('Topics are not enabled for this channel');
    }
    const member = await this.assertMember(channelId, userId);
    if (!this.isManager(member)) {
      const permission = (settings.createTopicsPermission as string) || 'all';
      if (permission === 'admins' || !this.can(channel, member, 'createTopics')) {
        throw new ForbiddenException('Only admins can create topics here');
      }
    }
    const topic = await this.chatRepository.createTopic({
      channelId,
      accountId,
      name: dto.name,
      iconEmoji: dto.iconEmoji,
      color: dto.color,
      createdByUserId: userId,
    });
    this.logChannelEvent(channelId, accountId, userId, 'topic.create', {
      topicId: topic.id,
      name: dto.name,
    });
    return topic;
  }

  async updateTopic(
    channelId: number,
    accountId: number,
    userId: number,
    topicId: number,
    dto: {
      name?: string;
      iconEmoji?: string;
      color?: string;
      isClosed?: boolean;
      isPinned?: boolean;
      postPermission?: 'all' | 'admins' | 'custom';
      allowedUserIds?: number[] | null;
    },
  ) {
    await this.findChannelById(channelId, accountId);
    const topic = await this.chatRepository.findTopicById(topicId);
    if (!topic || topic.channelId !== channelId) {
      throw new NotFoundException('Topic not found');
    }
    const member = await this.assertMember(channelId, userId);
    const isManager = this.isManager(member);
    const isCreator = topic.createdByUserId === userId;
    if (!isManager && !isCreator) {
      throw new ForbiddenException('You cannot edit this topic');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.iconEmoji !== undefined) data.iconEmoji = dto.iconEmoji;
    if (dto.color !== undefined) data.color = dto.color;
    // Закрытие/закрепление/право записи в теме — действие владельца/админа.
    if (dto.isClosed !== undefined) {
      if (!isManager) throw new ForbiddenException('Only admins can close/reopen topics');
      data.isClosed = dto.isClosed;
    }
    if (dto.isPinned !== undefined) {
      if (!isManager) throw new ForbiddenException('Only admins can pin topics');
      data.isPinned = dto.isPinned;
      data.pinnedAt = dto.isPinned ? new Date() : null;
    }
    if (dto.postPermission !== undefined) {
      if (!isManager) throw new ForbiddenException('Only admins can change who can post');
      if (!['all', 'admins', 'custom'].includes(dto.postPermission)) {
        throw new BadRequestException('postPermission must be "all", "admins" or "custom"');
      }
      data.postPermission = dto.postPermission;
      // При переключении в custom принимаем список; уходя из custom — очищаем
      if (dto.postPermission === 'custom') {
        const ids = Array.isArray(dto.allowedUserIds) ? dto.allowedUserIds.map(Number).filter(Number.isFinite) : [];
        data.allowedUserIds = ids;
      } else {
        data.allowedUserIds = null;
      }
    } else if (dto.allowedUserIds !== undefined) {
      // Обновление только списка (тема уже в custom)
      if (!isManager) throw new ForbiddenException('Only admins can change who can post');
      data.allowedUserIds = Array.isArray(dto.allowedUserIds)
        ? dto.allowedUserIds.map(Number).filter(Number.isFinite)
        : null;
    }

    const updated = await this.chatRepository.updateTopic(topicId, data);

    // Отдельные записи для смысловых действий (закрытие/закрепление/переименование).
    const name = (dto.name ?? topic.name) as string;
    if (dto.isClosed !== undefined) {
      this.logChannelEvent(channelId, accountId, userId, dto.isClosed ? 'topic.close' : 'topic.reopen', { topicId, name });
    }
    if (dto.isPinned !== undefined) {
      this.logChannelEvent(channelId, accountId, userId, dto.isPinned ? 'topic.pin' : 'topic.unpin', { topicId, name });
    }
    if (dto.name !== undefined && dto.name !== topic.name) {
      this.logChannelEvent(channelId, accountId, userId, 'topic.rename', { topicId, name: dto.name, oldName: topic.name });
    }

    return updated;
  }

  async deleteTopic(
    channelId: number,
    accountId: number,
    userId: number,
    topicId: number,
  ) {
    await this.findChannelById(channelId, accountId);
    const topic = await this.chatRepository.findTopicById(topicId);
    if (!topic || topic.channelId !== channelId) {
      throw new NotFoundException('Topic not found');
    }
    if (topic.isGeneral) {
      throw new ForbiddenException('The General topic cannot be deleted');
    }
    const member = await this.assertMember(channelId, userId);
    const isManager = this.isManager(member);
    const isCreator = topic.createdByUserId === userId;
    if (!isManager && !isCreator) {
      throw new ForbiddenException('You cannot delete this topic');
    }
    await this.chatRepository.softDeleteTopic(topicId);
    this.logChannelEvent(channelId, accountId, userId, 'topic.delete', {
      topicId,
      name: topic.name,
    });
    return { success: true, topicId };
  }

  async getTopicMutedUserIds(topicId: number): Promise<number[]> {
    return this.chatRepository.getTopicMutedUserIds(topicId);
  }

  async markTopicRead(channelId: number, userId: number, topicId: number) {
    const topic = await this.chatRepository.findTopicById(topicId);
    if (!topic || topic.channelId !== channelId) {
      throw new NotFoundException('Topic not found');
    }
    await this.assertMember(channelId, userId);
    await this.chatRepository.markTopicRead(topicId, userId);
    return { success: true, topicId };
  }

  /** Прочтения темы по участникам — для галочек «прочитано» в форуме. */
  async getTopicReads(
    channelId: number,
    userId: number,
    topicId: number,
  ) {
    const topic = await this.chatRepository.findTopicById(topicId);
    if (!topic || topic.channelId !== channelId) {
      throw new NotFoundException('Topic not found');
    }
    await this.assertMember(channelId, userId);
    const rows = await this.chatRepository.getTopicReads(topicId);
    return rows.map((r) => ({
      userId: r.userId,
      lastReadAt: r.lastReadAt ? r.lastReadAt.toISOString() : null,
    }));
  }

  /** Включение/выключение режима тем + право на создание (только админ канала). */
  async setTopicsConfig(
    channelId: number,
    accountId: number,
    userId: number,
    dto: { topicsEnabled?: boolean; createTopicsPermission?: 'all' | 'admins' },
  ) {
    const channel = await this.findChannelById(channelId, accountId);
    const member = await this.assertMember(channelId, userId);
    if (!this.isManager(member)) {
      throw new ForbiddenException('Only admins can change topic settings');
    }

    const settings = { ...((channel.settings as Record<string, unknown>) || {}) };
    const wasEnabled = !!settings.topicsEnabled;

    if (dto.topicsEnabled !== undefined) settings.topicsEnabled = dto.topicsEnabled;
    if (dto.createTopicsPermission !== undefined) {
      settings.createTopicsPermission = dto.createTopicsPermission;
    }

    // Первое включение: создаём General и переносим в неё все старые сообщения.
    if (!wasEnabled && settings.topicsEnabled) {
      const general = await this.ensureGeneralTopic(channelId, accountId);
      await this.chatRepository.setMessagesTopic(channelId, general.id);
    }

    await this.chatRepository.updateChannel(channelId, accountId, { settings });

    if (dto.topicsEnabled !== undefined && dto.topicsEnabled !== wasEnabled) {
      this.logChannelEvent(
        channelId,
        accountId,
        userId,
        dto.topicsEnabled ? 'topics.enable' : 'topics.disable',
      );
    }

    return {
      success: true,
      topicsEnabled: !!settings.topicsEnabled,
      createTopicsPermission: settings.createTopicsPermission || 'all',
    };
  }
}
