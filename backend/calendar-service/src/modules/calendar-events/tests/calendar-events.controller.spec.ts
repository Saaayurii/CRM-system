import { Test, TestingModule } from '@nestjs/testing';
import { CalendarEventsController } from '../calendar-events.controller';
import { CalendarEventsService } from '../calendar-events.service';

describe('CalendarEventsController', () => {
  let controller: CalendarEventsController;
  let service: jest.Mocked<CalendarEventsService>;

  const mockUser = { id: 10, email: 'test@test.com', roleId: 1, accountId: 1 };

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
      controllers: [CalendarEventsController],
      providers: [
        {
          provide: CalendarEventsService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CalendarEventsController>(CalendarEventsController);
    service = module.get(CalendarEventsService);
  });

  describe('findAll', () => {
    it('should return paginated calendar events', async () => {
      service.findAll.mockResolvedValue(mockPaginatedEvents);

      const result = await controller.findAll(1);

      expect(result).toEqual(mockPaginatedEvents);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return an event by ID', async () => {
      service.findById.mockResolvedValue(mockEvent);

      const result = await controller.findById(1, 1);

      expect(result).toEqual(mockEvent);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should create a new calendar event', async () => {
      const dto = { title: 'Meeting', startDate: '2026-03-01' } as any;
      service.create.mockResolvedValue(mockEvent);

      const result = await controller.create(1, 10, dto);

      expect(result).toEqual(mockEvent);
      expect(service.create).toHaveBeenCalledWith(1, 10, dto);
    });
  });

  describe('update', () => {
    it('should update a calendar event', async () => {
      const dto = { title: 'Updated Meeting' } as any;
      const updatedEvent = { ...mockEvent, title: 'Updated Meeting' };
      service.update.mockResolvedValue(updatedEvent);

      const result = await controller.update(1, 1, dto);

      expect(result.title).toBe('Updated Meeting');
      expect(service.update).toHaveBeenCalledWith(1, 1, dto);
    });
  });

  describe('delete', () => {
    it('should delete a calendar event', async () => {
      service.delete.mockResolvedValue({ message: 'Event deleted' } as any);

      const result = await controller.delete(1, 1);

      expect(result).toBeDefined();
      expect(service.delete).toHaveBeenCalledWith(1, 1);
    });
  });
});
