import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ChatRepository } from './repositories/chat.repository';
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

  constructor(private readonly chatRepository: ChatRepository) {}

  // --- Channels ---

  async findAllChannels(
    accountId: number,
    page: number = 1,
    limit: number = 20,
  ) {
    return this.chatRepository.findAllChannels(accountId, page, limit);
  }

  async findChannelById(id: number, accountId: number) {
    const channel = await this.chatRepository.findChannelById(id, accountId);
    if (!channel) {
      throw new NotFoundException(`Chat channel with ID ${id} not found`);
    }
    return channel;
  }

  async createChannel(
    accountId: number,
    userId: number,
    dto: CreateChannelDto,
  ) {
    return this.chatRepository.createChannel({
      accountId,
      channelType: dto.channelType,
      name: dto.name,
      description: dto.description,
      projectId: dto.projectId,
      constructionSiteId: dto.constructionSiteId,
      teamId: dto.teamId,
      createdByUserId: userId,
      isPrivate: dto.isPrivate || false,
      settings: dto.settings || {},
      members: {
        create: { userId, role: 'admin' },
      },
    });
  }

  async updateChannel(
    id: number,
    accountId: number,
    dto: UpdateChannelDto,
  ) {
    await this.findChannelById(id, accountId);
    await this.chatRepository.updateChannel(id, accountId, dto);
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
    accountId: number,
    cursor?: number,
    limit: number = 50,
  ) {
    await this.findChannelById(channelId, accountId);
    return this.chatRepository.findChannelMessagesCursor(channelId, cursor, limit);
  }

  async createMessage(
    channelId: number,
    accountId: number,
    userId: number,
    dto: SendMessageDto,
  ) {
    await this.findChannelById(channelId, accountId);

    return this.chatRepository.createMessage({
      channelId,
      userId,
      messageText: dto.messageText,
      messageType: dto.messageType || 'text',
      attachments: dto.attachments || [],
      replyToMessageId: dto.replyToMessageId,
    });
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

    const reactions: Record<string, number[]> = (message.reactions as any) || {};
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
    return { channelId, lastReadAt: new Date() };
  }

  async getUnreadSummary(userId: number) {
    return this.chatRepository.getUnreadSummary(userId);
  }

  async getUserChannelIds(userId: number): Promise<number[]> {
    const memberships = await this.chatRepository.findUserChannels(userId);
    return memberships.map((m: any) => m.channelId);
  }
}
