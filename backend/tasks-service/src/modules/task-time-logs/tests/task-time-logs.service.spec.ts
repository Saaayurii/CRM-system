import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TaskTimeLogsService } from '../task-time-logs.service';
import { TaskTimeLogRepository } from '../repositories/task-time-log.repository';

describe('TaskTimeLogsService', () => {
  let service: TaskTimeLogsService;
  let repository: jest.Mocked<TaskTimeLogRepository>;

  const mockTimeLog = {
    id: 1,
    taskId: 1,
    userId: 1,
    startTime: new Date('2024-01-15T09:00:00Z'),
    endTime: new Date('2024-01-15T17:00:00Z'),
    durationMinutes: 480,
    description: 'Worked on foundation',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskTimeLogsService,
        {
          provide: TaskTimeLogRepository,
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

    service = module.get<TaskTimeLogsService>(TaskTimeLogsService);
    repository = module.get(TaskTimeLogRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated task time logs', async () => {
      const mockResult = { data: [mockTimeLog], total: 1, page: 1, limit: 20, totalPages: 1 };
      repository.findAll.mockResolvedValue(mockResult);

      const result = await service.findAll(1, 20, { taskId: 1, userId: 1 });

      expect(result).toEqual(mockResult);
      expect(repository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        taskId: 1,
        userId: 1,
      });
    });

    it('should use default pagination when not provided', async () => {
      const mockResult = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      repository.findAll.mockResolvedValue(mockResult);

      await service.findAll();

      expect(repository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        taskId: undefined,
        userId: undefined,
      });
    });
  });

  describe('findById', () => {
    it('should return a task time log when found', async () => {
      repository.findById.mockResolvedValue(mockTimeLog);

      const result = await service.findById(1);

      expect(result).toEqual(mockTimeLog);
      expect(repository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when time log not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a task time log', async () => {
      const createDto = {
        taskId: 1,
        startTime: '2024-01-15T09:00:00Z',
        endTime: '2024-01-15T17:00:00Z',
        durationMinutes: 480,
        userId: 1,
        description: 'Worked on foundation',
      };
      repository.create.mockResolvedValue(mockTimeLog);

      const result = await service.create(createDto);

      expect(result).toEqual(mockTimeLog);
      expect(repository.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update and return the task time log', async () => {
      const updateDto = { description: 'Updated description' };
      repository.findById.mockResolvedValue(mockTimeLog);
      repository.update.mockResolvedValue({ ...mockTimeLog, description: 'Updated description' });

      const result = await service.update(1, updateDto);

      expect(result.description).toBe('Updated description');
      expect(repository.update).toHaveBeenCalledWith(1, updateDto);
    });

    it('should throw NotFoundException when time log not found for update', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(999, { description: 'test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete the task time log', async () => {
      repository.findById.mockResolvedValue(mockTimeLog);
      repository.delete.mockResolvedValue(undefined);

      await service.remove(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when time log not found for removal', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
