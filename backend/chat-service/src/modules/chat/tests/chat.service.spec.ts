import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ChatService } from '../chat.service';
import { ChatRepository } from '../repositories/chat.repository';

describe('ChatService', () => {
  let service: ChatService;
  let repository: jest.Mocked<ChatRepository>;

  const mockChannel = {
    id: 1,
    accountId: 1,
    channelType: 'group',
    name: 'General',
    description: 'General discussion',
    createdByUserId: 10,
    isPrivate: false,
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessage = {
    id: 1,
    channelId: 1,
    userId: 10,
    messageText: 'Hello world',
    messageType: 'text',
    attachments: [],
    reactions: {},
    isEdited: false,
    isDeleted: false,
    createdAt: new Date(),
  };

  const mockPaginatedChannels = {
    data: [mockChannel],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: ChatRepository,
          useValue: {
            findAllChannels: jest.fn(),
            findChannelById: jest.fn(),
            createChannel: jest.fn(),
            updateChannel: jest.fn(),
            deleteChannel: jest.fn(),
            findChannelMembers: jest.fn(),
            findChannelMember: jest.fn(),
            addChannelMember: jest.fn(),
            removeChannelMember: jest.fn(),
            findChannelMessages: jest.fn(),
            findChannelMessagesCursor: jest.fn(),
            createMessage: jest.fn(),
            findMessageById: jest.fn(),
            updateMessage: jest.fn(),
            deleteMessage: jest.fn(),
            updateLastReadAt: jest.fn(),
            getUnreadSummary: jest.fn(),
            findUserChannels: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    repository = module.get(ChatRepository);
  });

  describe('findAllChannels', () => {
    it('should return paginated channels', async () => {
      repository.findAllChannels.mockResolvedValue(mockPaginatedChannels);

      const result = await service.findAllChannels(1, 1, 20);

      expect(result).toEqual(mockPaginatedChannels);
      expect(repository.findAllChannels).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findChannelById', () => {
    it('should return a channel when found', async () => {
      repository.findChannelById.mockResolvedValue(mockChannel);

      const result = await service.findChannelById(1, 1);

      expect(result).toEqual(mockChannel);
    });

    it('should throw NotFoundException when channel not found', async () => {
      repository.findChannelById.mockResolvedValue(null);

      await expect(service.findChannelById(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createChannel', () => {
    it('should create a channel and add creator as admin member', async () => {
      const dto = {
        channelType: 'group',
        name: 'New Channel',
        description: 'Test',
        isPrivate: false,
      } as any;
      repository.createChannel.mockResolvedValue(mockChannel);

      const result = await service.createChannel(1, 10, dto);

      expect(result).toEqual(mockChannel);
      expect(repository.createChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 1,
          createdByUserId: 10,
          members: { create: { userId: 10, role: 'admin' } },
        }),
      );
    });
  });

  describe('deleteChannel', () => {
    it('should delete an existing channel', async () => {
      repository.findChannelById.mockResolvedValue(mockChannel);
      repository.deleteChannel.mockResolvedValue(undefined);

      const result = await service.deleteChannel(1, 1);

      expect(result.message).toContain('deleted successfully');
    });

    it('should throw NotFoundException if channel does not exist', async () => {
      repository.findChannelById.mockResolvedValue(null);

      await expect(service.deleteChannel(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addChannelMember', () => {
    it('should add a new member to the channel', async () => {
      const dto = { userId: 20, role: 'member' };
      const mockMember = { id: 1, channelId: 1, userId: 20, role: 'member' };
      repository.findChannelById.mockResolvedValue(mockChannel);
      repository.findChannelMember.mockResolvedValue(null);
      repository.addChannelMember.mockResolvedValue(mockMember);

      const result = await service.addChannelMember(1, 1, dto as any);

      expect(result).toEqual(mockMember);
    });

    it('should throw ConflictException if user is already a member', async () => {
      const dto = { userId: 20, role: 'member' };
      repository.findChannelById.mockResolvedValue(mockChannel);
      repository.findChannelMember.mockResolvedValue({
        id: 1,
        channelId: 1,
        userId: 20,
      });

      await expect(service.addChannelMember(1, 1, dto as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('editMessage', () => {
    it('should edit a message owned by the user', async () => {
      const dto = { messageText: 'Updated text' };
      const editedMessage = {
        ...mockMessage,
        messageText: 'Updated text',
        isEdited: true,
      };
      repository.findMessageById.mockResolvedValue(mockMessage);
      repository.updateMessage.mockResolvedValue(editedMessage);

      const result = await service.editMessage(1, 10, dto as any);

      expect(result.messageText).toBe('Updated text');
      expect(repository.updateMessage).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ isEdited: true }),
      );
    });

    it('should throw NotFoundException if message does not exist', async () => {
      repository.findMessageById.mockResolvedValue(null);

      await expect(
        service.editMessage(999, 10, { messageText: 'test' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own the message', async () => {
      repository.findMessageById.mockResolvedValue({
        ...mockMessage,
        userId: 99,
      });

      await expect(
        service.editMessage(1, 10, { messageText: 'test' } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message owned by the user', async () => {
      repository.findMessageById.mockResolvedValue(mockMessage);
      repository.deleteMessage.mockResolvedValue(undefined);

      const result = await service.deleteMessage(1, 10);

      expect(result.message).toContain('deleted');
    });

    it('should throw ForbiddenException if user does not own the message', async () => {
      repository.findMessageById.mockResolvedValue({
        ...mockMessage,
        userId: 99,
      });

      await expect(service.deleteMessage(1, 10)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('reactToMessage', () => {
    it('should add a reaction to a message', async () => {
      repository.findMessageById.mockResolvedValue({
        ...mockMessage,
        reactions: {},
      });
      repository.updateMessage.mockResolvedValue({
        ...mockMessage,
        reactions: { thumbsup: [10] },
      });

      const result = await service.reactToMessage(1, 10, {
        reaction: 'thumbsup',
      } as any);

      expect(repository.updateMessage).toHaveBeenCalledWith(1, {
        reactions: { thumbsup: [10] },
      });
    });

    it('should remove a reaction if user already reacted', async () => {
      repository.findMessageById.mockResolvedValue({
        ...mockMessage,
        reactions: { thumbsup: [10] },
      });
      repository.updateMessage.mockResolvedValue({
        ...mockMessage,
        reactions: {},
      });

      await service.reactToMessage(1, 10, { reaction: 'thumbsup' } as any);

      expect(repository.updateMessage).toHaveBeenCalledWith(1, {
        reactions: {},
      });
    });
  });

  describe('markAsRead', () => {
    it('should update last read timestamp for a channel member', async () => {
      repository.updateLastReadAt.mockResolvedValue(undefined);

      const result = await service.markAsRead(1, 10);

      expect(result.channelId).toBe(1);
      expect(result.lastReadAt).toBeDefined();
      expect(repository.updateLastReadAt).toHaveBeenCalledWith(1, 10);
    });
  });

  describe('getUserChannelIds', () => {
    it('should return channel IDs for a user', async () => {
      repository.findUserChannels.mockResolvedValue([
        { channelId: 1 },
        { channelId: 2 },
      ]);

      const result = await service.getUserChannelIds(10);

      expect(result).toEqual([1, 2]);
    });
  });
});
