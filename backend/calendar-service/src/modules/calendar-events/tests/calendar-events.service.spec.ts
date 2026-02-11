import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CalendarEventsService } from '../calendar-events.service';
import { CalendarEventRepository } from '../repositories/calendar-event.repository';

describe('CalendarEventsService', () => {
  let service: CalendarEventsService;
  let repository: jest.Mocked<CalendarEventRepository>;

  const mockEvent = {
    id: 1,
    accountId: 1,
    title: 'Team Meeting',
    description: 'Weekly sync',
    startDate: new Date('2026-03-01T10:00:00Z'),
    endDate: new Date('2026-03-01T11:00:00Z'),
    createdByUserId: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedEvents = {
    data: [mockEvent],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarEventsService,
        {
          provide: CalendarEventRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CalendarEventsService>(CalendarEventsService);
    repository = module.get(CalendarEventRepository);
  });

  describe('findAll', () => {
    it('should return paginated calendar events', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedEvents);

      const result = await service.findAll(1, 1, 20);

      expect(result).toEqual(mockPaginatedEvents);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findById', () => {
    it('should return an event when found', async () => {
      repository.findById.mockResolvedValue(mockEvent);

      const result = await service.findById(1, 1);

      expect(result).toEqual(mockEvent);
      expect(repository.findById).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when event not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a calendar event', async () => {
      const dto = {
        title: 'Team Meeting',
        description: 'Weekly sync',
        startDate: '2026-03-01T10:00:00Z',
        endDate: '2026-03-01T11:00:00Z',
      };
      repository.create.mockResolvedValue(mockEvent);

      const result = await service.create(1, 10, dto as any);

      expect(result).toEqual(mockEvent);
      expect(repository.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an existing event', async () => {
      const updatedEvent = { ...mockEvent, title: 'Updated Meeting' };
      repository.findById.mockResolvedValue(mockEvent);
      repository.update.mockResolvedValue(updatedEvent);

      const result = await service.update(1, 1, { title: 'Updated Meeting' } as any);

      expect(result.title).toBe('Updated Meeting');
    });

    it('should throw NotFoundException if event does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(999, 1, {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete an existing event', async () => {
      repository.findById.mockResolvedValue(mockEvent);
      repository.delete.mockResolvedValue(undefined);

      const result = await service.delete(1, 1);

      expect(result).toBeDefined();
      expect(repository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException if event does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
