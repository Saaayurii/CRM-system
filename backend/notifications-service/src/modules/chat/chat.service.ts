import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ChatRepository } from './repositories/chat.repository';
import {
  CreateChatChannelDto,
  UpdateChatChannelDto,
  AddChannelMemberDto,
  CreateChatMessageDto,
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
    dto: CreateChatChannelDto,
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
    });
  }

  async updateChannel(
    id: number,
    accountId: number,
    dto: UpdateChatChannelDto,
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
    dto: AddChannelMemberDto,
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

  async createMessage(
    channelId: number,
    accountId: number,
    userId: number,
    dto: CreateChatMessageDto,
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
}
