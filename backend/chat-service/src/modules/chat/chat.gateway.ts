import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Server } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedSocket } from '../../common/interfaces/authenticated-socket.interface';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';
import { WsExceptionFilter } from '../../common/filters/ws-exception.filter';
import { ChatService } from './chat.service';
import { PresenceService } from '../presence/presence.service';
import { NotificationsClientService } from './notifications-client.service';
import * as jwt from 'jsonwebtoken';

// Heartbeat-presence: живые сокеты продлеваются каждые 30с,
// записи без продления дольше 75с считаются протухшими (2 пропущенных бита + запас)
const PRESENCE_HEARTBEAT_MS = 30_000;
const PRESENCE_STALE_MS = 75_000;

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
@UseFilters(new WsExceptionFilter())
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // key: `${userId}:${channelId}`
  private readonly typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  // track which channels a socket is typing in for disconnect cleanup
  private readonly socketTypingChannels = new Map<string, { userId: number; channelId: number; name: string }[]>();

  // Активность «отправляет фото/видео/файл/голосовое» — параллель typing,
  // key: `${userId}:${channelId}`
  private readonly activityTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  // отслеживаем, в каких каналах сокет показывает активность (для disconnect)
  private readonly socketActivityChannels = new Map<string, { userId: number; channelId: number; name: string }[]>();

  constructor(
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
    private readonly presenceService: PresenceService,
    private readonly notificationsClient: NotificationsClientService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket server initialized (Redis adapter via main.ts)');
    // Presence-heartbeat (та же идея, что у авто-сброса «печатает»):
    // живые сокеты продлевают свежесть записи, протухшие записи вычищаются —
    // самовосстановление после рестартов/обрывов, когда handleDisconnect не сработал.
    setInterval(() => {
      this.refreshPresence().catch((err) =>
        this.logger.warn(`Presence heartbeat failed: ${err.message}`),
      );
    }, PRESENCE_HEARTBEAT_MS);
  }

  private async refreshPresence(): Promise<void> {
    // fetchSockets() через Redis-адаптер видит сокеты всех инстансов
    const sockets = await this.server.fetchSockets();
    const userIds = Array.from(
      new Set(
        sockets
          .map((s) => (s.data as { userId?: number })?.userId)
          .filter((id): id is number => typeof id === 'number'),
      ),
    );
    await this.presenceService.refreshUsers(userIds);

    const staleUserIds = await this.presenceService.sweepStale(PRESENCE_STALE_MS);
    if (staleUserIds.length > 0) {
      const lastSeen = await this.presenceService.getLastSeen(staleUserIds);
      for (const userId of staleUserIds) {
        this.server.emit('presence:offline', {
          userId,
          lastSeenAt: lastSeen[userId] ? new Date(lastSeen[userId]!).toISOString() : null,
        });
        this.logger.debug(`Presence sweep: user ${userId} marked offline (stale)`);
      }
    }
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Connection rejected: no token (${client.id})`);
        client.disconnect();
        return;
      }

      const secret =
        this.configService.get<string>('jwt.accessSecret') || 'default-secret';
      const payload = jwt.verify(token, secret) as any;

      client.user = {
        id: payload.sub,
        email: payload.email,
        roleId: payload.roleId,
        accountId: payload.accountId,
        name: payload.name || payload.email,
      };
      // Expose userId on socket.data so it survives fetchSockets() — used to
      // skip push notifications for users currently viewing the channel.
      client.data.userId = payload.sub;

      // Mark user as online
      await this.presenceService.setUserOnline(client.user.id, client.id);

      // Join user to all their channel rooms
      const channelIds = await this.chatService.getUserChannelIds(
        client.user.id,
      );
      for (const channelId of channelIds) {
        client.join(`channel:${channelId}`);
      }

      // Notify others that user is online
      client.broadcast.emit('presence:online', {
        userId: client.user.id,
        name: client.user.name,
      });

      // Send current online snapshot to the newly connected client
      const onlineUserIds = await this.presenceService.getOnlineUserIds();
      client.emit('presence:snapshot', { userIds: onlineUserIds });

      this.logger.log(
        `User ${client.user.id} (${client.user.email}) connected — socket: ${client.id}, channels: ${channelIds.length}`,
      );
    } catch (error) {
      this.logger.warn(`Connection rejected: invalid token (${client.id})`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (!client.user) return;

    const stillOnline = await this.presenceService.removeConnection(
      client.user.id,
      client.id,
    );

    if (!stillOnline) {
      client.broadcast.emit('presence:offline', {
        userId: client.user.id,
        lastSeenAt: new Date().toISOString(),
      });
    }

    // Clear any pending typing indicators for this socket
    const typingEntries = this.socketTypingChannels.get(client.id) || [];
    for (const { userId, channelId, name } of typingEntries) {
      const key = `${userId}:${channelId}`;
      const t = this.typingTimeouts.get(key);
      if (t) { clearTimeout(t); this.typingTimeouts.delete(key); }
      this.server.to(`channel:${channelId}`).emit('typing:stop', { userId, channelId, name });
    }
    this.socketTypingChannels.delete(client.id);

    // Clear any pending upload-activity indicators for this socket
    const activityEntries = this.socketActivityChannels.get(client.id) || [];
    for (const { userId, channelId, name } of activityEntries) {
      const key = `${userId}:${channelId}`;
      const t = this.activityTimeouts.get(key);
      if (t) { clearTimeout(t); this.activityTimeouts.delete(key); }
      this.server.to(`channel:${channelId}`).emit('activity:stop', { userId, channelId, name });
    }
    this.socketActivityChannels.delete(client.id);

    this.logger.log(
      `User ${client.user.id} disconnected — socket: ${client.id}`,
    );
  }

  // --- Messages ---

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      channelId: number;
      messageText?: string;
      messageType?: string;
      attachments?: any[];
      replyToMessageId?: number;
      topicId?: number;
    },
  ) {
    const message = await this.chatService.createMessage(
      data.channelId,
      client.user.accountId,
      client.user.id,
      {
        messageText: data.messageText,
        messageType: data.messageType,
        attachments: data.attachments,
        replyToMessageId: data.replyToMessageId,
        topicId: data.topicId,
      },
    );

    this.server.to(`channel:${data.channelId}`).emit('message:new', message);

    // Users currently viewing this channel (socket joined the room) — they
    // see the message live, so no push needed even if it's already read.
    const activeViewerIds = new Set<number>(
      (await this.server.in(`channel:${data.channelId}`).fetchSockets())
        .map((s) => s.data?.userId as number | undefined)
        .filter((id): id is number => typeof id === 'number'),
    );

    // Push notifications to all channel members except the sender (fire-and-forget)
    void this.chatService
      .getChannelForNotification(data.channelId)
      .then(async (channel) => {
        if (!channel) return;
        // Форум: исключаем тех, кто замьютил конкретную тему
        const topicMuted = message.topicId
          ? new Set(await this.chatService.getTopicMutedUserIds(message.topicId))
          : new Set<number>();
        const senderName = client.user.name || 'Пользователь';
        const isDirect = channel.channelType === 'direct';
        const title = isDirect
          ? senderName
          : `${senderName} → ${channel.name || 'Чат'}`;
        const preview = data.messageText
          ? data.messageText.slice(0, 120)
          : '📎 Вложение';
        const actionUrl = message.topicId
          ? `/dashboard/chat?channelId=${data.channelId}&topicId=${message.topicId}`
          : `/dashboard/chat?channelId=${data.channelId}`;

        const now = Date.now();
        const payloads = channel.members
          .filter((m: { userId: number; isMuted?: boolean; mutedUntil?: Date | null }) => {
            if (m.userId === client.user.id) return false;
            if (activeViewerIds.has(m.userId)) return false; // already viewing the channel
            if (topicMuted.has(m.userId)) return false; // muted this topic
            if (m.isMuted) {
              const until = m.mutedUntil ? new Date(m.mutedUntil).getTime() : Infinity;
              if (until > now) return false; // still muted
            }
            return true;
          })
          .map((m: { userId: number }) => ({
            userId: m.userId,
            accountId: client.user.accountId,
            title,
            message: preview,
            notificationType: 'chat_message',
            priority: 2,
            channels: ['in_app', 'push'],
            actionUrl,
            // Link to the message itself so the notification can be removed if
            // the message is later deleted.
            entityType: 'chat_message',
            entityId: message.id,
          }));

        this.notificationsClient.sendToMany(payloads);
      })
      .catch((err) =>
        this.logger.error('Chat notification fan-out failed', err),
      );

    return { event: 'message:send:ack', data: message };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message:edit')
  async handleEditMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: number; messageText: string },
  ) {
    const message = await this.chatService.editMessage(
      data.messageId,
      client.user.id,
      { messageText: data.messageText },
    );

    const channelId = message.channelId;
    this.server.to(`channel:${channelId}`).emit('message:edited', message);

    return { event: 'message:edit:ack', data: message };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: number },
  ) {
    const result = await this.chatService.deleteMessage(
      data.messageId,
      client.user.id,
    );

    // Get message info before deletion for broadcasting
    this.server.emit('message:deleted', {
      messageId: data.messageId,
      deletedBy: client.user.id,
    });

    // Remove any notifications that referenced this message (fire-and-forget)
    void this.notificationsClient.deleteByEntity('chat_message', data.messageId);

    return { event: 'message:delete:ack', data: result };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message:reaction')
  async handleReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: number; reaction: string },
  ) {
    const message = await this.chatService.reactToMessage(
      data.messageId,
      client.user.id,
      { reaction: data.reaction },
    );

    const channelId = message.channelId;
    this.server
      .to(`channel:${channelId}`)
      .emit('message:reaction:updated', message);

    return { event: 'message:reaction:ack', data: message };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message:read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: number },
  ) {
    const result = await this.chatService.markAsRead(
      data.channelId,
      client.user.id,
    );

    // Notify ALL members in the channel room (including sender's other devices)
    // so that message senders see their checkmarks update to "read"
    this.server.to(`channel:${data.channelId}`).emit('message:read:updated', {
      channelId: data.channelId,
      userId: client.user.id,
      lastReadAt: result.lastReadAt,
    });

    return { event: 'message:read:ack', data: result };
  }

  // --- Typing ---

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: number },
  ) {
    const { id: userId, name, accountId } = client.user;
    const { channelId } = data;
    const key = `${userId}:${channelId}`;

    // Track for disconnect cleanup
    const existing = this.socketTypingChannels.get(client.id) || [];
    if (!existing.some((e) => e.channelId === channelId)) {
      this.socketTypingChannels.set(client.id, [...existing, { userId, channelId, name }]);
    }

    // Reset server-side auto-stop timeout (5 s)
    const prev = this.typingTimeouts.get(key);
    if (prev) clearTimeout(prev);
    const t = setTimeout(() => {
      this.typingTimeouts.delete(key);
      this.server.to(`channel:${channelId}`).emit('typing:stop', { userId, channelId, name });
      // Remove from disconnect tracking
      const entries = this.socketTypingChannels.get(client.id) || [];
      this.socketTypingChannels.set(client.id, entries.filter((e) => e.channelId !== channelId));
    }, 5000);
    this.typingTimeouts.set(key, t);

    client.to(`channel:${channelId}`).emit('typing:start', { userId, name, channelId });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: number },
  ) {
    const { id: userId, name } = client.user;
    const { channelId } = data;
    const key = `${userId}:${channelId}`;

    const t = this.typingTimeouts.get(key);
    if (t) { clearTimeout(t); this.typingTimeouts.delete(key); }

    // Remove from disconnect tracking
    const entries = this.socketTypingChannels.get(client.id) || [];
    this.socketTypingChannels.set(client.id, entries.filter((e) => e.channelId !== channelId));

    client.to(`channel:${channelId}`).emit('typing:stop', { userId, channelId, name });
  }

  // --- Upload activity («отправляет фото/видео/файл/голосовое») ---

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('activity:start')
  handleActivityStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: number; kind?: string },
  ) {
    const { id: userId, name } = client.user;
    const { channelId } = data;
    const kind = data.kind || 'file';
    const key = `${userId}:${channelId}`;

    // Track for disconnect cleanup
    const existing = this.socketActivityChannels.get(client.id) || [];
    if (!existing.some((e) => e.channelId === channelId)) {
      this.socketActivityChannels.set(client.id, [...existing, { userId, channelId, name }]);
    }

    // Авто-стоп через 30 с (загрузка может идти дольше typing; отправитель шлёт
    // activity:start периодически, пока грузит — таймаут сбрасывается)
    const prev = this.activityTimeouts.get(key);
    if (prev) clearTimeout(prev);
    const t = setTimeout(() => {
      this.activityTimeouts.delete(key);
      this.server.to(`channel:${channelId}`).emit('activity:stop', { userId, channelId, name });
      const entries = this.socketActivityChannels.get(client.id) || [];
      this.socketActivityChannels.set(client.id, entries.filter((e) => e.channelId !== channelId));
    }, 30000);
    this.activityTimeouts.set(key, t);

    client.to(`channel:${channelId}`).emit('activity:start', { userId, name, channelId, kind });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('activity:stop')
  handleActivityStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: number },
  ) {
    const { id: userId, name } = client.user;
    const { channelId } = data;
    const key = `${userId}:${channelId}`;

    const t = this.activityTimeouts.get(key);
    if (t) { clearTimeout(t); this.activityTimeouts.delete(key); }

    const entries = this.socketActivityChannels.get(client.id) || [];
    this.socketActivityChannels.set(client.id, entries.filter((e) => e.channelId !== channelId));

    client.to(`channel:${channelId}`).emit('activity:stop', { userId, channelId, name });
  }

  // --- Channel rooms ---

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('channel:join')
  handleJoinChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: number },
  ) {
    client.join(`channel:${data.channelId}`);
    this.logger.debug(
      `User ${client.user.id} joined room channel:${data.channelId}`,
    );
    return { event: 'channel:join:ack', data: { channelId: data.channelId } };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('channel:leave')
  handleLeaveChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: number },
  ) {
    client.leave(`channel:${data.channelId}`);
    this.logger.debug(
      `User ${client.user.id} left room channel:${data.channelId}`,
    );
    return { event: 'channel:leave:ack', data: { channelId: data.channelId } };
  }

  // --- Pinned messages ---

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message:pin')
  async handlePinMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      channelId: number;
      messageId: number;
      messageText?: string;
      senderName?: string;
      topicId?: number;
    },
  ) {
    const { pinnedMessages, systemMessage, topicId } = await this.chatService.pinMessage(
      data.channelId,
      data.messageId,
      (data.messageText || '').slice(0, 200),
      data.senderName || '',
      client.user.accountId,
      client.user.name,
      data.topicId,
    );

    this.server.to(`channel:${data.channelId}`).emit('message:pinned', {
      channelId: data.channelId,
      topicId,
      pinnedMessages,
    });

    this.server.to(`channel:${data.channelId}`).emit('message:new', systemMessage);

    return { event: 'message:pin:ack' };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message:unpin')
  async handleUnpinMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: number; messageId: number; topicId?: number },
  ) {
    const { pinnedMessages, systemMessage, topicId } = await this.chatService.unpinMessage(
      data.channelId,
      data.messageId,
      client.user.accountId,
      client.user.name,
      data.topicId,
    );

    this.server.to(`channel:${data.channelId}`).emit('message:unpinned', {
      channelId: data.channelId,
      topicId,
      pinnedMessages,
    });

    this.server.to(`channel:${data.channelId}`).emit('message:new', systemMessage);

    return { event: 'message:unpin:ack' };
  }

  // --- Topics ---

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('topic:read')
  async handleTopicRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: number; topicId: number },
  ) {
    await this.chatService.markTopicRead(
      data.channelId,
      client.user.id,
      data.topicId,
    );

    // Уведомляем другие устройства пользователя того же канала, чтобы счётчики
    // непрочитанного по теме синхронизировались.
    this.server.to(`channel:${data.channelId}`).emit('topic:read:updated', {
      channelId: data.channelId,
      topicId: data.topicId,
      userId: client.user.id,
    });

    return { event: 'topic:read:ack', data: { topicId: data.topicId } };
  }
}
