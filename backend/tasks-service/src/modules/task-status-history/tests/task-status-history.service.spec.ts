import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TaskStatusHistoryService } from '../task-status-history.service';
import { TaskStatusHistoryRepository } from '../repositories/task-status-history.repository';

describe('TaskStatusHistoryService', () => {
  let service: TaskStatusHistoryService;
  let repository: jest.Mocked<TaskStatusHistoryRepository>;

  const mockRecord = {
    id: 1,
    taskId: 1,
    changedByUserId: 1,
    oldStatus: 0,
    newStatus: 1,
    changeReason: 'Started work',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskStatusHistoryService,
        {
          provide: TaskStatusHistoryRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TaskStatusHistoryService>(TaskStatusHistoryService);
    repository = module.get(TaskStatusHistoryRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated task status history records', async () => {
      const mockResult = {
        data: [mockRecord],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      repository.findAll.mockResolvedValue(mockResult);

      const result = await service.findAll(1, 20, { taskId: 1 });

      expect(result).toEqual(mockResult);
      expect(repository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        taskId: 1,
      });
    });

    it('should use default pagination when not provided', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      repository.findAll.mockResolvedValue(mockResult);

      await service.findAll();

      expect(repository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        taskId: undefined,
      });
    });
  });

  describe('findById', () => {
    it('should return a task status history record when found', async () => {
      repository.findById.mockResolvedValue(mockRecord);

      const result = await service.findById(1);

      expect(result).toEqual(mockRecord);
      expect(repository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when record not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a task status history record', async () => {
      const createDto = {
        taskId: 1,
        oldStatus: 0,
        newStatus: 1,
        changedByUserId: 1,
        changeReason: 'Started work',
      };
      repository.create.mockResolvedValue(mockRecord);

      const result = await service.create(createDto);

      expect(result).toEqual(mockRecord);
      expect(repository.create).toHaveBeenCalledWith(createDto);
    });

    it('should create a record with minimal fields', async () => {
      const createDto = { taskId: 1 };
      repository.create.mockResolvedValue({
        ...mockRecord,
        oldStatus: undefined,
        newStatus: undefined,
      });

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(createDto);
    });
  });
});
