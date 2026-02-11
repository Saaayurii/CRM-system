import { Test, TestingModule } from '@nestjs/testing';
import { EventLogsController } from '../event-logs.controller';
import { EventLogsService } from '../event-logs.service';

describe('EventLogsController', () => {
  let controller: EventLogsController;
  let service: jest.Mocked<EventLogsService>;

  const mockEventLog = {
    id: 1,
    accountId: 1,
    userId: 10,
    entityType: 'client',
    entityId: 5,
    action: 'CREATE',
    details: { name: 'Test Client' },
    createdAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockEventLog],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventLogsController],
      providers: [
        {
          provide: EventLogsService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EventLogsController>(EventLogsController);
    service = module.get(EventLogsService);
  });

  describe('findAll', () => {
    it('should return paginated event logs', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll(1, 1, 20);

      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(
        1,
        1,
        20,
        undefined,
        undefined,
      );
    });

    it('should pass optional filters', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll(1, 2, 10, 'client', 10);

      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 2, 10, 'client', 10);
    });
  });

  describe('findOne', () => {
    it('should return an event log by id', async () => {
      service.findById.mockResolvedValue(mockEventLog);

      const result = await controller.findOne(1, 1);

      expect(result).toEqual(mockEventLog);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should create a new event log', async () => {
      const createDto = {
        userId: 10,
        entityType: 'client',
        entityId: 5,
        action: 'CREATE',
        details: { name: 'Test Client' },
      };
      service.create.mockResolvedValue(mockEventLog);

      const result = await controller.create(createDto as any, 1);

      expect(result).toEqual(mockEventLog);
      expect(service.create).toHaveBeenCalledWith(1, createDto);
    });
  });
});
