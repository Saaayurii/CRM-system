import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import {
  CreateChannelDto,
  UpdateChannelDto,
  AddMemberDto,
  SendMessageDto,
  EditMessageDto,
  CreateTopicDto,
  UpdateTopicDto,
} from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PresenceService } from '../presence/presence.service';
import { ChatGateway } from './chat.gateway';

// Topics (forum): /topics, /topics-config, /topics/:id/{read,mute,hide}
// (rebuild marker: ensure topics routes are live on prod)
@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat-channels')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly presenceService: PresenceService,
    private readonly chatGateway: ChatGateway,
  ) {}

  // --- Channels ---

  @Get()
  @ApiOperation({ summary: 'Get all chat channels' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'projectId', required: false, type: Number })
  @ApiQuery({ name: 'archived', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Channels retrieved' })
  findAllChannels(
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('projectId') projectId?: string,
    @Query('archived') archived?: string,
  ) {
    return this.chatService.findAllChannels(
      accountId,
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      projectId ? parseInt(projectId, 10) : undefined,
      archived === 'true',
    );
  }

  @Get('archived-count')
  @ApiOperation({ summary: 'Get count of archived channels for current user' })
  @ApiResponse({ status: 200, description: 'Archived count' })
  getArchivedCount(@CurrentUser('id') userId: number) {
    return this.chatService.getArchivedCount(userId);
  }

  @Get('unread-summary')
  @ApiOperation({ summary: 'Get unread message counts per channel' })
  @ApiResponse({ status: 200, description: 'Unread summary retrieved' })
  getUnreadSummary(@CurrentUser('id') userId: number) {
    return this.chatService.getUnreadSummary(userId);
  }

  @Get('last-seen')
  @ApiOperation({ summary: 'When the given users were last online' })
  @ApiQuery({
    name: 'userIds',
    required: true,
    description: 'Comma-separated user ids',
  })
  @ApiResponse({ status: 200, description: 'Map userId → ISO date | null' })
  async getLastSeen(@Query('userIds') userIdsRaw?: string) {
    const userIds = this.parseUserIds(userIdsRaw);
    const lastSeen = await this.resolveLastSeen(userIds);
    const result: Record<number, string | null> = {};
    for (const id of userIds) {
      result[id] = lastSeen[id] ?? null;
    }
    return result;
  }

  @Get('presence')
  @ApiOperation({ summary: 'Online status + last seen for the given users' })
  @ApiQuery({
    name: 'userIds',
    required: true,
    description: 'Comma-separated user ids',
  })
  @ApiResponse({
    status: 200,
    description: 'Map userId → { online, lastSeenAt }',
  })
  async getPresence(@Query('userIds') userIdsRaw?: string) {
    const userIds = this.parseUserIds(userIdsRaw);
    const [online, lastSeen] = await Promise.all([
      this.presenceService.getOnlineUsers(userIds),
      this.resolveLastSeen(userIds),
    ]);
    const result: Record<
      number,
      { online: boolean; lastSeenAt: string | null }
    > = {};
    for (const id of userIds) {
      result[id] = { online: !!online[id], lastSeenAt: lastSeen[id] ?? null };
    }
    return result;
  }

  private parseUserIds(raw?: string): number[] {
    return (raw || '')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0)
      .slice(0, 100);
  }

  /**
   * Redis эфемерный: после рестарта presence:lastseen пуст — добираем
   * из user_sessions.last_seen_at (обновляется при ротации refresh-токена)
   */
  private async resolveLastSeen(
    userIds: number[],
  ): Promise<Record<number, string | null>> {
    const lastSeen = await this.presenceService.getLastSeen(userIds);
    const missing = userIds.filter((id) => !lastSeen[id]);
    const fromSessions =
      missing.length > 0
        ? await this.chatService.getLastSeenFromSessions(missing)
        : {};
    const result: Record<number, string | null> = {};
    for (const id of userIds) {
      result[id] = lastSeen[id]
        ? new Date(lastSeen[id]).toISOString()
        : fromSessions[id]
          ? fromSessions[id].toISOString()
          : null;
    }
    return result;
  }

  @Get('media')
  @ApiOperation({
    summary: 'Get all chat attachments accessible to the current user',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Media attachments retrieved' })
  findUserMediaAttachments(
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.findUserMediaAttachments(
      accountId,
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a chat channel' })
  @ApiResponse({ status: 201, description: 'Channel created' })
  createChannel(
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
    @Body() dto: CreateChannelDto,
  ) {
    return this.chatService.createChannel(accountId, userId, dto);
  }

  @Post('import-telegram')
  @ApiOperation({ summary: 'Import a Telegram chat export as a CRM channel' })
  @ApiResponse({
    status: 201,
    description: 'Channel created with imported messages',
  })
  importTelegram(
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
    @Body() body: any,
  ) {
    return this.chatService.importTelegram(accountId, userId, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get chat channel by ID' })
  @ApiResponse({ status: 200, description: 'Channel retrieved' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  findChannelById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.chatService.findChannelByIdForUser(id, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update chat channel' })
  @ApiResponse({ status: 200, description: 'Channel updated' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async updateChannel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
    @Body() dto: UpdateChannelDto,
  ) {
    const channel = await this.chatService.updateChannel(id, accountId, dto);
    // Реалтайм-рассылка изменений шапки/настроек всем участникам канала
    const settings = (channel.settings as Record<string, unknown>) || {};
    this.chatGateway.server.to(`channel:${id}`).emit('channel:updated', {
      channelId: id,
      name: channel.name,
      description: channel.description,
      isPrivate: channel.isPrivate,
      avatarUrl: settings.avatarUrl ?? null,
      settings,
    });
    return channel;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete chat channel' })
  @ApiResponse({ status: 200, description: 'Channel deleted' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  deleteChannel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.chatService.deleteChannel(id, accountId);
  }

  @Patch(':id/archive')
  @ApiOperation({
    summary: 'Archive or unarchive a channel for the current user',
  })
  @ApiResponse({ status: 200, description: 'Channel archive status updated' })
  archiveChannel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body('isArchived') isArchived: boolean,
  ) {
    return this.chatService.archiveChannel(id, userId, isArchived);
  }

  @Patch(':id/pin')
  @ApiOperation({ summary: 'Pin or unpin a channel for the current user' })
  @ApiResponse({ status: 200, description: 'Channel pin status updated' })
  pinChannel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body('isPinned') isPinned: boolean,
  ) {
    return this.chatService.pinChannel(id, userId, !!isPinned);
  }

  @Patch(':id/mute')
  @ApiOperation({
    summary:
      'Mute notifications for the current user (mutedUntil = ISO string or null to unmute)',
  })
  @ApiResponse({ status: 200, description: 'Channel mute status updated' })
  muteChannelSelf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body('mutedUntil') mutedUntil: string | null,
  ) {
    const date = mutedUntil ? new Date(mutedUntil) : null;
    return this.chatService.muteChannelForUser(id, userId, date);
  }

  @Patch(':id/mark-unread')
  @ApiOperation({ summary: 'Mark channel as unread for the current user' })
  @ApiResponse({ status: 200, description: 'Channel marked as unread' })
  markChannelUnread(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.markChannelUnread(id, userId);
  }

  @Delete(':id/messages')
  @ApiOperation({ summary: 'Clear channel message history (admin only)' })
  @ApiResponse({ status: 200, description: 'Channel history cleared' })
  clearChannelHistory(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.clearChannelHistory(id, accountId, userId);
  }

  // --- Topics (Telegram-style forum topics) ---

  @Get(':id/topics')
  @ApiOperation({ summary: 'List topics of a forum channel' })
  @ApiResponse({ status: 200, description: 'Topics retrieved' })
  listTopics(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.chatService.listTopics(id, user);
  }

  @Patch(':id/topics-config')
  @ApiOperation({ summary: 'Enable/disable topics mode + create-topics permission' })
  @ApiResponse({ status: 200, description: 'Topics config updated' })
  async setTopicsConfig(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
    @Body() body: { topicsEnabled?: boolean; createTopicsPermission?: 'all' | 'admins' },
  ) {
    const result = await this.chatService.setTopicsConfig(id, accountId, userId, body);
    this.chatGateway.server.to(`channel:${id}`).emit('topics:config', {
      channelId: id,
      topicsEnabled: result.topicsEnabled,
      createTopicsPermission: result.createTopicsPermission,
    });
    return result;
  }

  @Post(':id/topics')
  @ApiOperation({ summary: 'Create a topic in a forum channel' })
  @ApiResponse({ status: 201, description: 'Topic created' })
  async createTopic(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
    @Body() dto: CreateTopicDto,
  ) {
    const topic = await this.chatService.createTopic(id, accountId, userId, dto);
    this.chatGateway.server
      .to(`channel:${id}`)
      .emit('topic:created', { channelId: id, topic });
    return topic;
  }

  @Put(':id/topics/:topicId')
  @ApiOperation({ summary: 'Edit a topic (name/icon/color, pin/close)' })
  @ApiResponse({ status: 200, description: 'Topic updated' })
  async updateTopic(
    @Param('id', ParseIntPipe) id: number,
    @Param('topicId', ParseIntPipe) topicId: number,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
    @Body() dto: UpdateTopicDto,
  ) {
    const topic = await this.chatService.updateTopic(id, accountId, userId, topicId, dto);
    this.chatGateway.server
      .to(`channel:${id}`)
      .emit('topic:updated', { channelId: id, topic });
    return topic;
  }

  @Delete(':id/topics/:topicId')
  @ApiOperation({ summary: 'Delete a topic (soft delete; General is protected)' })
  @ApiResponse({ status: 200, description: 'Topic deleted' })
  async deleteTopic(
    @Param('id', ParseIntPipe) id: number,
    @Param('topicId', ParseIntPipe) topicId: number,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
  ) {
    const result = await this.chatService.deleteTopic(id, accountId, userId, topicId);
    this.chatGateway.server
      .to(`channel:${id}`)
      .emit('topic:deleted', { channelId: id, topicId });
    return result;
  }

  @Patch(':id/topics/:topicId/read')
  @ApiOperation({ summary: 'Mark a topic as read for the current user' })
  @ApiResponse({ status: 200, description: 'Topic marked as read' })
  markTopicRead(
    @Param('id', ParseIntPipe) id: number,
    @Param('topicId', ParseIntPipe) topicId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.markTopicRead(id, userId, topicId);
  }

  @Patch(':id/topics/:topicId/mute')
  @ApiOperation({ summary: 'Mute/unmute a topic for the current user' })
  @ApiResponse({ status: 200, description: 'Topic mute updated' })
  muteTopic(
    @Param('id', ParseIntPipe) id: number,
    @Param('topicId', ParseIntPipe) topicId: number,
    @CurrentUser('id') userId: number,
    @Body('mutedUntil') mutedUntil: string | null,
  ) {
    return this.chatService.muteTopic(id, userId, topicId, mutedUntil ? new Date(mutedUntil) : null);
  }

  @Patch(':id/topics/:topicId/hide')
  @ApiOperation({ summary: 'Hide/show a topic for the current user' })
  @ApiResponse({ status: 200, description: 'Topic hidden state updated' })
  hideTopic(
    @Param('id', ParseIntPipe) id: number,
    @Param('topicId', ParseIntPipe) topicId: number,
    @CurrentUser('id') userId: number,
    @Body('hidden') hidden: boolean,
  ) {
    return this.chatService.hideTopic(id, userId, topicId, !!hidden);
  }

  // --- Members ---

  @Get(':id/members')
  @ApiOperation({ summary: 'Get channel members' })
  @ApiResponse({ status: 200, description: 'Members retrieved' })
  findChannelMembers(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.chatService.findChannelMembers(id, accountId);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to channel' })
  @ApiResponse({ status: 201, description: 'Member added' })
  @ApiResponse({ status: 409, description: 'Member already exists' })
  addChannelMember(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
    @Body() dto: AddMemberDto,
  ) {
    return this.chatService.addChannelMember(id, accountId, dto);
  }

  @Patch(':id/members/:userId')
  @ApiOperation({ summary: 'Mute or unmute a channel member' })
  @ApiResponse({ status: 200, description: 'Member updated' })
  muteChannelMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') requestingUserId: number,
    @Body('isMuted') isMuted: boolean,
  ) {
    return this.chatService.muteChannelMember(
      id,
      accountId,
      requestingUserId,
      userId,
      isMuted,
    );
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove member from channel' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  removeChannelMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.chatService.removeChannelMember(id, accountId, userId);
  }

  // --- Messages ---

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get channel messages (cursor-based pagination)' })
  @ApiQuery({ name: 'cursor', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'topicId', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Messages retrieved' })
  findChannelMessages(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('topicId') topicId?: string,
  ) {
    return this.chatService.findChannelMessagesCursor(
      id,
      user,
      cursor ? parseInt(cursor, 10) : undefined,
      limit ? parseInt(limit, 10) : 50,
      topicId ? parseInt(topicId, 10) : undefined,
    );
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send message to channel' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  createMessage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('id') userId: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.createMessage(id, accountId, userId, dto);
  }

  // --- Message operations ---

  @Post('messages/:id/burn-media')
  @ApiOperation({
    summary: 'Burn a self-destruct media attachment (исчезающие медиа)',
  })
  @ApiResponse({ status: 201, description: 'Attachment burned' })
  async burnMedia(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body() body: { fileUrl?: string },
  ) {
    const result = await this.chatService.burnMedia(
      id,
      userId,
      body?.fileUrl ?? '',
    );
    if (result.burned) {
      // Все клиенты канала прячут вложение сразу, без перезагрузки
      this.chatGateway.server
        .to(`channel:${result.channelId}`)
        .emit('message:media:burned', {
          channelId: result.channelId,
          messageId: result.messageId,
          fileUrl: result.fileUrl,
        });
    }
    return result;
  }

  @Put('messages/:id')
  @ApiOperation({ summary: 'Edit a message' })
  @ApiResponse({ status: 200, description: 'Message edited' })
  editMessage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body() dto: EditMessageDto,
  ) {
    return this.chatService.editMessage(id, userId, dto);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete a message (soft delete)' })
  @ApiResponse({ status: 200, description: 'Message deleted' })
  deleteMessage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.chatService.deleteMessage(id, userId);
  }
}
