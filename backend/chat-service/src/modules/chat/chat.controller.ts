import {
  Controller,
  Get,
  Post,
  Put,
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
} from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat-channels')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // --- Channels ---

  @Get()
  @ApiOperation({ summary: 'Get all chat channels' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Channels retrieved' })
  findAllChannels(
    @CurrentUser('accountId') accountId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.findAllChannels(
      accountId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('unread-summary')
  @ApiOperation({ summary: 'Get unread message counts per channel' })
  @ApiResponse({ status: 200, description: 'Unread summary retrieved' })
  getUnreadSummary(@CurrentUser('id') userId: number) {
    return this.chatService.getUnreadSummary(userId);
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

  @Get(':id')
  @ApiOperation({ summary: 'Get chat channel by ID' })
  @ApiResponse({ status: 200, description: 'Channel retrieved' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  findChannelById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
  ) {
    return this.chatService.findChannelById(id, accountId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update chat channel' })
  @ApiResponse({ status: 200, description: 'Channel updated' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  updateChannel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.chatService.updateChannel(id, accountId, dto);
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
  @ApiResponse({ status: 200, description: 'Messages retrieved' })
  findChannelMessages(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.findChannelMessagesCursor(
      id,
      accountId,
      cursor ? parseInt(cursor, 10) : undefined,
      limit ? parseInt(limit, 10) : 50,
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
