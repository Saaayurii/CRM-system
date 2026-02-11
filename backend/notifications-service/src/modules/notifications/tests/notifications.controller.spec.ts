import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from '../notifications.controller';
import { NotificationsService } from '../notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: jest.Mocked<NotificationsService>;

  const mockUser = { id: 10, email: 'test@test.com', roleId: 1, accountId: 1 };

  const mockNotification = {
    id: 1,
    accountId: 1,
    userId: 10,
    title: 'Test Notification',
    message: 'You have a new task',
    isRead: false,
    createdAt: new Date(),
  };

  const mockAnnouncement = {
    id: 1,
    accountId: 1,
    title: 'Company Update',
    content: 'New policy',
    createdAt: new Date(),
  };

  const mockPaginatedNotifications = {
    data: [mockNotification],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  const mockPaginatedAnnouncements = {
    data: [mockAnnouncement],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: {
            findAllNotifications: jest.fn(),
            findNotificationById: jest.fn(),
            createNotification: jest.fn(),
            updateNotification: jest.fn(),
            markAsRead: jest.fn(),
            findAllAnnouncements: jest.fn(),
            findAnnouncementById: jest.fn(),
            createAnnouncement: jest.fn(),
            updateAnnouncement: jest.fn(),
            deleteAnnouncement: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get(NotificationsService);
  });

  describe('findAllNotifications', () => {
    it('should return paginated notifications for the current user', async () => {
      service.findAllNotifications.mockResolvedValue(
        mockPaginatedNotifications,
      );

      const result = await controller.findAllNotifications(1, 10);

      expect(result).toEqual(mockPaginatedNotifications);
      expect(service.findAllNotifications).toHaveBeenCalledWith(
        1,
        10,
        1,
        20,
        undefined,
      );
    });

    it('should parse page and limit query parameters', async () => {
      service.findAllNotifications.mockResolvedValue(
        mockPaginatedNotifications,
      );

      await controller.findAllNotifications(1, 10, '2', '10', 'true');

      expect(service.findAllNotifications).toHaveBeenCalledWith(
        1,
        10,
        2,
        10,
        true,
      );
    });
  });

  describe('findNotificationById', () => {
    it('should return a notification by ID', async () => {
      service.findNotificationById.mockResolvedValue(mockNotification);

      const result = await controller.findNotificationById(1, 1);

      expect(result).toEqual(mockNotification);
      expect(service.findNotificationById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('createNotification', () => {
    it('should create a notification', async () => {
      const dto = { userId: 10, title: 'New', message: 'Hello' } as any;
      service.createNotification.mockResolvedValue(mockNotification);

      const result = await controller.createNotification(1, dto);

      expect(result).toEqual(mockNotification);
      expect(service.createNotification).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const readNotification = { ...mockNotification, isRead: true };
      service.markAsRead.mockResolvedValue(readNotification);

      const result = await controller.markAsRead(1, 1);

      expect(result.isRead).toBe(true);
      expect(service.markAsRead).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('findAllAnnouncements', () => {
    it('should return paginated announcements', async () => {
      service.findAllAnnouncements.mockResolvedValue(
        mockPaginatedAnnouncements,
      );

      const result = await controller.findAllAnnouncements(1);

      expect(result).toEqual(mockPaginatedAnnouncements);
      expect(service.findAllAnnouncements).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('createAnnouncement', () => {
    it('should create an announcement', async () => {
      const dto = { title: 'Update', content: 'New policy' } as any;
      service.createAnnouncement.mockResolvedValue(mockAnnouncement);

      const result = await controller.createAnnouncement(1, 10, dto);

      expect(result).toEqual(mockAnnouncement);
      expect(service.createAnnouncement).toHaveBeenCalledWith(1, 10, dto);
    });
  });

  describe('deleteAnnouncement', () => {
    it('should delete an announcement', async () => {
      service.deleteAnnouncement.mockResolvedValue({
        message: 'Announcement with ID 1 deleted successfully',
      });

      const result = await controller.deleteAnnouncement(1, 1);

      expect(result.message).toContain('deleted successfully');
      expect(service.deleteAnnouncement).toHaveBeenCalledWith(1, 1);
    });
  });
});
