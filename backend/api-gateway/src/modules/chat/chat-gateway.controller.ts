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
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { existsSync, unlinkSync } from 'fs';
import { join, basename } from 'path';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const CHAT_UPLOAD_DIR = join(process.cwd(), 'uploads', 'chat');

/** Удалить файл чата с локального тома вместе с видео-вариантами (480p/720p) */
function deleteChatFile(fileUrl: string) {
  const safe = basename(fileUrl);
  if (!safe) return;
  try {
    const filePath = join(CHAT_UPLOAD_DIR, safe);
    if (existsSync(filePath)) unlinkSync(filePath);
    const nameWithoutExt = safe.replace(/\.[^.]+$/, '');
    for (const label of ['480p', '720p']) {
      const variantPath = join(
        CHAT_UPLOAD_DIR,
        `${nameWithoutExt}_${label}.mp4`,
      );
      if (existsSync(variantPath)) unlinkSync(variantPath);
    }
  } catch {
    // файл уже удалён/недоступен — не валим запрос
  }
}

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class ChatGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  // --- Channels ---

  @Get('chat-channels')
  @ApiOperation({ summary: 'Get all chat channels' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'archived', required: false })
  async findAllChannels(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('projectId') projectId?: number,
    @Query('archived') archived?: string,
  ) {
    return this.proxyService.forward('chat', {
      method: 'GET',
      path: '/chat-channels',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit, projectId, archived },
    });
  }

  @Get('chat-channels/unread-summary')
  @ApiOperation({ summary: 'Get unread message counts per channel' })
  async getUnreadSummary(@Req() req: Request) {
    return this.proxyService.forward('chat', {
      method: 'GET',
      path: '/chat-channels/unread-summary',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get('chat-channels/archived-count')
  @ApiOperation({ summary: 'Get count of archived channels for current user' })
  async getArchivedCount(@Req() req: Request) {
    return this.proxyService.forward('chat', {
      method: 'GET',
      path: '/chat-channels/archived-count',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get('chat-channels/last-seen')
  @ApiOperation({ summary: 'When the given users were last online' })
  async getLastSeen(@Req() req: Request, @Query('userIds') userIds?: string) {
    return this.proxyService.forward('chat', {
      method: 'GET',
      path: '/chat-channels/last-seen',
      params: { userIds: userIds || '' },
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get('chat-channels/media')
  @ApiOperation({
    summary: 'Get all chat attachments accessible to the current user',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getUserMediaAttachments(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('chat', {
      method: 'GET',
      path: '/chat-channels/media',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Patch('chat-channels/:id/archive')
  @ApiOperation({
    summary: 'Archive or unarchive a channel for the current user',
  })
  async archiveChannel(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('chat', {
      method: 'PATCH',
      path: `/chat-channels/${id}/archive`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Patch('chat-channels/:id/pin')
  @ApiOperation({ summary: 'Pin or unpin a channel for the current user' })
  async pinChannel(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('chat', {
      method: 'PATCH',
      path: `/chat-channels/${id}/pin`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Patch('chat-channels/:id/mute')
  @ApiOperation({ summary: 'Mute notifications for current user' })
  async muteChannel(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('chat', {
      method: 'PATCH',
      path: `/chat-channels/${id}/mute`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Patch('chat-channels/:id/mark-unread')
  @ApiOperation({ summary: 'Mark channel as unread for current user' })
  async markChannelUnread(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('chat', {
      method: 'PATCH',
      path: `/chat-channels/${id}/mark-unread`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
    });
  }

  @Delete('chat-channels/:id/messages')
  @ApiOperation({ summary: 'Clear channel message history (admin only)' })
  async clearChannelHistory(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('chat', {
      method: 'DELETE',
      path: `/chat-channels/${id}/messages`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get('chat-channels/:id')
  @ApiOperation({ summary: 'Get chat channel by ID' })
  async findOneChannel(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('chat', {
      method: 'GET',
      path: `/chat-channels/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('chat-channels')
  @ApiOperation({ summary: 'Create chat channel' })
  async createChannel(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('chat', {
      method: 'POST',
      path: '/chat-channels',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Post('chat-channels/import-telegram')
  @ApiOperation({ summary: 'Import Telegram chat export as CRM channel' })
  async importTelegram(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('chat', {
      method: 'POST',
      path: '/chat-channels/import-telegram',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('chat-channels/:id')
  @ApiOperation({ summary: 'Update chat channel' })
  async updateChannel(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('chat', {
      method: 'PUT',
      path: `/chat-channels/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('chat-channels/:id')
  @ApiOperation({ summary: 'Delete chat channel' })
  async removeChannel(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('chat', {
      method: 'DELETE',
      path: `/chat-channels/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // --- Topics (forum) ---

  @Get('chat-channels/:id/topics')
  @ApiOperation({ summary: 'List forum topics of a channel' })
  async listTopics(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('chat', {
      method: 'GET',
      path: `/chat-channels/${id}/topics`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Patch('chat-channels/:id/topics-config')
  @ApiOperation({ summary: 'Enable/disable topics mode + create-topics permission' })
  async setTopicsConfig(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('chat', {
      method: 'PATCH',
      path: `/chat-channels/${id}/topics-config`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Post('chat-channels/:id/topics')
  @ApiOperation({ summary: 'Create a forum topic' })
  async createTopic(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('chat', {
      method: 'POST',
      path: `/chat-channels/${id}/topics`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('chat-channels/:id/topics/:topicId')
  @ApiOperation({ summary: 'Edit a forum topic' })
  async updateTopic(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('topicId') topicId: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('chat', {
      method: 'PUT',
      path: `/chat-channels/${id}/topics/${topicId}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('chat-channels/:id/topics/:topicId')
  @ApiOperation({ summary: 'Delete a forum topic' })
  async deleteTopic(@Req() req: Request, @Param('id') id: string, @Param('topicId') topicId: string) {
    return this.proxyService.forward('chat', {
      method: 'DELETE',
      path: `/chat-channels/${id}/topics/${topicId}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Patch('chat-channels/:id/topics/:topicId/read')
  @ApiOperation({ summary: 'Mark a topic as read' })
  async markTopicRead(@Req() req: Request, @Param('id') id: string, @Param('topicId') topicId: string) {
    return this.proxyService.forward('chat', {
      method: 'PATCH',
      path: `/chat-channels/${id}/topics/${topicId}/read`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
    });
  }

  @Patch('chat-channels/:id/topics/:topicId/mute')
  @ApiOperation({ summary: 'Mute/unmute a topic' })
  async muteTopic(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('topicId') topicId: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('chat', {
      method: 'PATCH',
      path: `/chat-channels/${id}/topics/${topicId}/mute`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Patch('chat-channels/:id/topics/:topicId/hide')
  @ApiOperation({ summary: 'Hide/show a topic' })
  async hideTopic(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('topicId') topicId: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('chat', {
      method: 'PATCH',
      path: `/chat-channels/${id}/topics/${topicId}/hide`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  // --- Members ---

  @Get('chat-channels/:id/members')
  @ApiOperation({ summary: 'Get chat channel members' })
  async getChannelMembers(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('chat', {
      method: 'GET',
      path: `/chat-channels/${id}/members`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('chat-channels/:id/members')
  @ApiOperation({ summary: 'Add chat channel member' })
  async addChannelMember(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('chat', {
      method: 'POST',
      path: `/chat-channels/${id}/members`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Patch('chat-channels/:id/members/:userId')
  @ApiOperation({ summary: 'Mute or unmute a channel member' })
  async muteChannelMember(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('chat', {
      method: 'PATCH',
      path: `/chat-channels/${id}/members/${userId}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('chat-channels/:id/members/:userId')
  @ApiOperation({ summary: 'Remove chat channel member' })
  async removeChannelMember(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.proxyService.forward('chat', {
      method: 'DELETE',
      path: `/chat-channels/${id}/members/${userId}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('chat-channels/:id/transfer-ownership')
  @ApiOperation({ summary: 'Transfer channel ownership to another member' })
  async transferOwnership(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('chat', {
      method: 'POST',
      path: `/chat-channels/${id}/transfer-ownership`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  // --- Messages ---

  @Get('chat-channels/:id/messages')
  @ApiOperation({ summary: 'Get chat channel messages' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'topicId', required: false })
  async getChannelMessages(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('cursor') cursor?: number,
    @Query('limit') limit?: number,
    @Query('topicId') topicId?: number,
  ) {
    return this.proxyService.forward('chat', {
      method: 'GET',
      path: `/chat-channels/${id}/messages`,
      headers: { authorization: req.headers.authorization || '' },
      params: { cursor, limit, topicId },
    });
  }

  @Post('chat-channels/:id/messages')
  @ApiOperation({ summary: 'Send chat message' })
  async sendMessage(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('chat', {
      method: 'POST',
      path: `/chat-channels/${id}/messages`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  // --- Message operations ---

  @Post('chat-messages/:id/burn-media')
  @ApiOperation({
    summary: 'Burn self-destruct media (исчезающие медиа) + удалить файл',
  })
  async burnMedia(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const result = await this.proxyService.forward<{
      burned?: boolean;
      fileUrl?: string;
    }>('chat', {
      method: 'POST',
      path: `/chat-channels/messages/${id}/burn-media`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
    // chat-service подтвердил сгорание — стираем файл с тома гейтвея
    if (result && result.burned && result.fileUrl) {
      deleteChatFile(result.fileUrl);
    }
    return result;
  }

  @Put('chat-messages/:id')
  @ApiOperation({ summary: 'Edit chat message' })
  async editMessage(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('chat', {
      method: 'PUT',
      path: `/chat-channels/messages/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('chat-messages/:id')
  @ApiOperation({ summary: 'Delete chat message' })
  async deleteMessage(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('chat', {
      method: 'DELETE',
      path: `/chat-channels/messages/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }
}
