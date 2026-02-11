import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import { NotificationRepository } from '../repositories/notification.repository';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repository: jest.Mocked<NotificationRepository>;

  const mockNotification = {
    id: 1,
    accountId: 1,
    userId: 10,
    title: 'Test Notification',
    message: 'You have a new task',
    notificationType: 'task',
    entityType: 'task',
    entityId: 5,
    channels: ['in_app'],
    priority: 2,
    actionUrl: null,
    isRead: false,
    readAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAnnouncement = {
    id: 1,
    accountId: 1,
    title: 'Company Update',
    content: 'We have a new policy',
    announcementType: 'general',
    priority: 2,
    publishedByUserId: 10,
    publishedAt: new Date(),
    targetAudience: {},
    isPinned: false,
    attachments: [],
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
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
      providers: [
        NotificationsService,
        {
          provide: NotificationRepository,
          useValue: {
            findAllNotifications: jest.fn(),
            findNotificationById: jest.fn(),
            createNotification: jest.fn(),
            updateNotification: jest.fn(),
            markAsRead: jest.fn(),
            countNotifications: jest.fn(),
            findAllAnnouncements: jest.fn(),
            findAnnouncementById: jest.fn(),
            createAnnouncement: jest.fn(),
            updateAnnouncement: jest.fn(),
            deleteAnnouncement: jest.fn(),
            countAnnouncements: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    repository = module.get(NotificationRepository);
  });

  describe('findAllNotifications', () => {
    it('should return paginated notifications for a user', async () => {
      repository.findAllNotifications.mockResolvedValue(mockPaginatedNotifications);

      const result = await service.findAllNotifications(1, 10, 1, 20);

      expect(result).toEqual(mockPaginatedNotifications);
      expect(repository.findAllNotifications).toHaveBeenCalledWith(1, 10, 1, 20, undefined);
    });

    it('should pass isRead filter when provided', async () => {
      repository.findAllNotifications.mockResolvedValue(mockPaginatedNotifications);

      await service.findAllNotifications(1, 10, 1, 20, false);

      expect(repository.findAllNotifications).toHaveBeenCalledWith(1, 10, 1, 20, false);
    });
  });

  describe('findNotificationById', () => {
    it('should return a notification when found', async () => {
      repository.findNotificationById.mockResolvedValue(mockNotification);

      const result = await service.findNotificationById(1, 1);

      expect(result).toEqual(mockNotification);
      expect(repository.findNotificationById).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when notification not found', async () => {
      repository.findNotificationById.mockResolvedValue(null);

      await expect(service.findNotificationById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createNotification', () => {
    it('should create a notification with default values', async () => {
      const dto = {
        userId: 10,
        title: 'New Task',
        message: 'Task assigned',
        notificationType: 'task',
        entityType: 'task',
        entityId: 5,
      };
      repository.createNotification.mockResolvedValue(mockNotification);

      const result = await service.createNotification(1, dto as any);

      expect(result).toEqual(mockNotification);
      expect(repository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 1,
          userId: 10,
          channels: ['in_app'],
          priority: 2,
        }),
      );
    });
  });

  describe('updateNotification', () => {
    it('should update an existing notification', async () => {
      const updatedNotification = { ...mockNotification, title: 'Updated' };
      repository.findNotificationById
        .mockResolvedValueOnce(mockNotification)
        .mockResolvedValueOnce(updatedNotification);
      repository.updateNotification.mockResolvedValue(undefined);

      const result = await service.updateNotification(1, 1, { title: 'Updated' } as any);

      expect(result.title).toBe('Updated');
    });

    it('should throw NotFoundException if notification does not exist', async () => {
      repository.findNotificationById.mockResolvedValue(null);

      await expect(service.updateNotification(999, 1, {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read and return updated notification', async () => {
      const readNotification = { ...mockNotification, isRead: true, readAt: new Date() };
      repository.findNotificationById
        .mockResolvedValueOnce(mockNotification)
        .mockResolvedValueOnce(readNotification);
      repository.markAsRead.mockResolvedValue(undefined);

      const result = await service.markAsRead(1, 1);

      expect(result.isRead).toBe(true);
      expect(repository.markAsRead).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException if notification does not exist', async () => {
      repository.findNotificationById.mockResolvedValue(null);

      await expect(service.markAsRead(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllAnnouncements', () => {
    it('should return paginated announcements', async () => {
      repository.findAllAnnouncements.mockResolvedValue(mockPaginatedAnnouncements);

      const result = await service.findAllAnnouncements(1, 1, 20);

      expect(result).toEqual(mockPaginatedAnnouncements);
      expect(repository.findAllAnnouncements).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findAnnouncementById', () => {
    it('should return an announcement when found', async () => {
      repository.findAnnouncementById.mockResolvedValue(mockAnnouncement);

      const result = await service.findAnnouncementById(1, 1);

      expect(result).toEqual(mockAnnouncement);
    });

    it('should throw NotFoundException when announcement not found', async () => {
      repository.findAnnouncementById.mockResolvedValue(null);

      await expect(service.findAnnouncementById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createAnnouncement', () => {
    it('should create an announcement with default values', async () => {
      const dto = {
        title: 'Company Update',
        content: 'New policy',
        announcementType: 'general',
      };
      repository.createAnnouncement.mockResolvedValue(mockAnnouncement);

      const result = await service.createAnnouncement(1, 10, dto as any);

      expect(result).toEqual(mockAnnouncement);
      expect(repository.createAnnouncement).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 1,
          publishedByUserId: 10,
          priority: 2,
          isPinned: false,
          attachments: [],
          targetAudience: {},
        }),
      );
    });
  });

  describe('deleteAnnouncement', () => {
    it('should delete an existing announcement', async () => {
      repository.findAnnouncementById.mockResolvedValue(mockAnnouncement);
      repository.deleteAnnouncement.mockResolvedValue(undefined);

      const result = await service.deleteAnnouncement(1, 1);

      expect(result.message).toContain('deleted successfully');
      expect(repository.deleteAnnouncement).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException if announcement does not exist', async () => {
      repository.findAnnouncementById.mockResolvedValue(null);

      await expect(service.deleteAnnouncement(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
