import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from '../chat.controller';
import { ChatService } from '../chat.service';

describe('ChatController', () => {
  let controller: ChatController;
  let service: jest.Mocked<ChatService>;

  const mockUser = { id: 10, email: 'test@test.com', roleId: 1, accountId: 1 };

  const mockChannel = {
    id: 1,
    accountId: 1,
    name: 'General',
    channelType: 'group',
    createdAt: new Date(),
  };

  const mockMessage = {
    id: 1,
    channelId: 1,
    userId: 10,
    messageText: 'Hello',
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
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: {
            findAllChannels: jest.fn(),
            findChannelById: jest.fn(),
            createChannel: jest.fn(),
            updateChannel: jest.fn(),
            deleteChannel: jest.fn(),
            findChannelMembers: jest.fn(),
            addChannelMember: jest.fn(),
            removeChannelMember: jest.fn(),
            findChannelMessages: jest.fn(),
            findChannelMessagesCursor: jest.fn(),
            createMessage: jest.fn(),
            editMessage: jest.fn(),
            deleteMessage: jest.fn(),
            getUnreadSummary: jest.fn(),
            markAsRead: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    service = module.get(ChatService);
  });

  describe('findAllChannels', () => {
    it('should return paginated channels with default pagination', async () => {
      service.findAllChannels.mockResolvedValue(mockPaginatedChannels);

      const result = await controller.findAllChannels(1, 10);

      expect(result).toEqual(mockPaginatedChannels);
      expect(service.findAllChannels).toHaveBeenCalledWith(1, 10, 1, 20);
    });

    it('should parse page and limit query parameters', async () => {
      service.findAllChannels.mockResolvedValue(mockPaginatedChannels);

      await controller.findAllChannels(1, 10, '2', '10');

      expect(service.findAllChannels).toHaveBeenCalledWith(1, 10, 2, 10);
    });
  });

  describe('findChannelById', () => {
    it('should return a channel by ID', async () => {
      service.findChannelById.mockResolvedValue(mockChannel);

      const result = await controller.findChannelById(1, 1);

      expect(result).toEqual(mockChannel);
      expect(service.findChannelById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('createChannel', () => {
    it('should create a channel', async () => {
      const dto = { channelType: 'group', name: 'New Channel' } as any;
      service.createChannel.mockResolvedValue(mockChannel);

      const result = await controller.createChannel(1, 10, dto);

      expect(result).toEqual(mockChannel);
      expect(service.createChannel).toHaveBeenCalledWith(1, 10, dto);
    });
  });

  describe('deleteChannel', () => {
    it('should delete a channel', async () => {
      service.deleteChannel.mockResolvedValue({
        message: 'Chat channel with ID 1 deleted successfully',
      });

      const result = await controller.deleteChannel(1, 1);

      expect(result.message).toContain('deleted successfully');
      expect(service.deleteChannel).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('findChannelMessages', () => {
    it('should return messages with cursor-based pagination', async () => {
      const mockCursorResult = { data: [mockMessage], nextCursor: null };
      service.findChannelMessagesCursor.mockResolvedValue(mockCursorResult);

      const result = await controller.findChannelMessages(1, 1);

      expect(result).toEqual(mockCursorResult);
      expect(service.findChannelMessagesCursor).toHaveBeenCalledWith(
        1,
        1,
        undefined,
        50,
      );
    });

    it('should pass cursor when provided', async () => {
      const mockCursorResult = { data: [mockMessage], nextCursor: null };
      service.findChannelMessagesCursor.mockResolvedValue(mockCursorResult);

      await controller.findChannelMessages(1, 1, '100', '25');

      expect(service.findChannelMessagesCursor).toHaveBeenCalledWith(
        1,
        1,
        100,
        25,
      );
    });
  });

  describe('createMessage', () => {
    it('should send a message to a channel', async () => {
      const dto = { messageText: 'Hello' } as any;
      service.createMessage.mockResolvedValue(mockMessage);

      const result = await controller.createMessage(1, 1, 10, dto);

      expect(result).toEqual(mockMessage);
      expect(service.createMessage).toHaveBeenCalledWith(1, 1, 10, dto);
    });
  });

  describe('editMessage', () => {
    it('should edit a message', async () => {
      const dto = { messageText: 'Edited' } as any;
      const editedMessage = {
        ...mockMessage,
        messageText: 'Edited',
        isEdited: true,
      };
      service.editMessage.mockResolvedValue(editedMessage);

      const result = await controller.editMessage(1, 10, dto);

      expect(result.messageText).toBe('Edited');
      expect(service.editMessage).toHaveBeenCalledWith(1, 10, dto);
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message', async () => {
      service.deleteMessage.mockResolvedValue({ message: 'Message 1 deleted' });

      const result = await controller.deleteMessage(1, 10);

      expect(result.message).toContain('deleted');
      expect(service.deleteMessage).toHaveBeenCalledWith(1, 10);
    });
  });
});
