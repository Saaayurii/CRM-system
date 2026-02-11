import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventLogsService } from '../event-logs.service';
import { EventLogRepository } from '../repositories/event-log.repository';

describe('EventLogsService', () => {
  let service: EventLogsService;
  let repository: jest.Mocked<EventLogRepository>;

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
      providers: [
        EventLogsService,
        {
          provide: EventLogRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EventLogsService>(EventLogsService);
    repository = module.get(EventLogRepository);
  });

  describe('findAll', () => {
    it('should return paginated event logs', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await service.findAll(1, 1, 20);

      expect(result).toEqual(mockPaginatedResult);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, undefined, undefined);
    });

    it('should pass entityType filter', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);

      await service.findAll(1, 1, 20, 'client');

      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, 'client', undefined);
    });

    it('should pass userId filter', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);

      await service.findAll(1, 1, 20, undefined, 10);

      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, undefined, 10);
    });

    it('should pass both entityType and userId filters', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);

      await service.findAll(1, 1, 20, 'client', 10);

      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, 'client', 10);
    });
  });

  describe('findById', () => {
    it('should return an event log by id and accountId', async () => {
      repository.findById.mockResolvedValue(mockEventLog);

      const result = await service.findById(1, 1);

      expect(result).toEqual(mockEventLog);
      expect(repository.findById).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when event log not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
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
      repository.create.mockResolvedValue(mockEventLog);

      const result = await service.create(1, createDto as any);

      expect(result).toEqual(mockEventLog);
      expect(repository.create).toHaveBeenCalledWith(1, createDto);
    });
  });
});
