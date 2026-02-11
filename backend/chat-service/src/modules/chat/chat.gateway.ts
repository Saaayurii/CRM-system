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
import * as jwt from 'jsonwebtoken';

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

  constructor(
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
    private readonly presenceService: PresenceService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket server initialized (Redis adapter via main.ts)');
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
      });
    }

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
      },
    );

    this.server.to(`channel:${data.channelId}`).emit('message:new', message);

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

    // Notify user's other devices
    client.broadcast.emit('message:read:updated', {
      userId: client.user.id,
      ...result,
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
    client.to(`channel:${data.channelId}`).emit('typing:start', {
      userId: client.user.id,
      name: client.user.name,
      channelId: data.channelId,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: number },
  ) {
    client.to(`channel:${data.channelId}`).emit('typing:stop', {
      userId: client.user.id,
      channelId: data.channelId,
    });
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
}
