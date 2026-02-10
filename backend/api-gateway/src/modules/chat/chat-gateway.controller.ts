import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

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
  async findAllChannels(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('chat', {
      method: 'GET', path: '/chat-channels',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('chat-channels/unread-summary')
  @ApiOperation({ summary: 'Get unread message counts per channel' })
  async getUnreadSummary(@Req() req: Request) {
    return this.proxyService.forward('chat', {
      method: 'GET', path: '/chat-channels/unread-summary',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get('chat-channels/:id')
  @ApiOperation({ summary: 'Get chat channel by ID' })
  async findOneChannel(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('chat', {
      method: 'GET', path: `/chat-channels/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('chat-channels')
  @ApiOperation({ summary: 'Create chat channel' })
  async createChannel(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('chat', {
      method: 'POST', path: '/chat-channels',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('chat-channels/:id')
  @ApiOperation({ summary: 'Update chat channel' })
  async updateChannel(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('chat', {
      method: 'PUT', path: `/chat-channels/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('chat-channels/:id')
  @ApiOperation({ summary: 'Delete chat channel' })
  async removeChannel(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('chat', {
      method: 'DELETE', path: `/chat-channels/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // --- Members ---

  @Get('chat-channels/:id/members')
  @ApiOperation({ summary: 'Get chat channel members' })
  async getChannelMembers(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('chat', {
      method: 'GET', path: `/chat-channels/${id}/members`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('chat-channels/:id/members')
  @ApiOperation({ summary: 'Add chat channel member' })
  async addChannelMember(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('chat', {
      method: 'POST', path: `/chat-channels/${id}/members`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('chat-channels/:id/members/:userId')
  @ApiOperation({ summary: 'Remove chat channel member' })
  async removeChannelMember(@Req() req: Request, @Param('id') id: string, @Param('userId') userId: string) {
    return this.proxyService.forward('chat', {
      method: 'DELETE', path: `/chat-channels/${id}/members/${userId}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // --- Messages ---

  @Get('chat-channels/:id/messages')
  @ApiOperation({ summary: 'Get chat channel messages' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getChannelMessages(@Req() req: Request, @Param('id') id: string, @Query('cursor') cursor?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('chat', {
      method: 'GET', path: `/chat-channels/${id}/messages`,
      headers: { authorization: req.headers.authorization || '' },
      params: { cursor, limit },
    });
  }

  @Post('chat-channels/:id/messages')
  @ApiOperation({ summary: 'Send chat message' })
  async sendMessage(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('chat', {
      method: 'POST', path: `/chat-channels/${id}/messages`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  // --- Message operations ---

  @Put('chat-messages/:id')
  @ApiOperation({ summary: 'Edit chat message' })
  async editMessage(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('chat', {
      method: 'PUT', path: `/chat-channels/messages/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('chat-messages/:id')
  @ApiOperation({ summary: 'Delete chat message' })
  async deleteMessage(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('chat', {
      method: 'DELETE', path: `/chat-channels/messages/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }
}
