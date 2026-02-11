import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TasksService } from '../tasks.service';
import { TaskRepository } from '../repositories/task.repository';

describe('TasksService', () => {
  let service: TasksService;
  let repository: jest.Mocked<TaskRepository>;

  const mockTask = {
    id: 1,
    accountId: 1,
    projectId: 1,
    parentTaskId: null,
    title: 'Test Task',
    description: 'Test description',
    taskType: 'construction',
    assignedToUserId: 2,
    createdByUserId: 1,
    priority: 2,
    status: 0,
    startDate: new Date(),
    dueDate: new Date(),
    estimatedHours: 8,
    locationDescription: 'Block A',
    tags: ['urgent'],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    subTasks: [],
    parentTask: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: TaskRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            findByProject: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            count: jest.fn(),
            getStats: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    repository = module.get(TaskRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated tasks', async () => {
      repository.findAll.mockResolvedValue([mockTask]);
      repository.count.mockResolvedValue(1);

      const result = await service.findAll(1, 1, 20);

      expect(result).toEqual({
        tasks: [mockTask],
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(repository.findAll).toHaveBeenCalledWith(1, { skip: 0, take: 20 });
    });

    it('should pass filters when provided', async () => {
      repository.findAll.mockResolvedValue([]);
      repository.count.mockResolvedValue(0);

      await service.findAll(1, 1, 20, { projectId: 1, status: 0, assignedToUserId: 2 });

      expect(repository.findAll).toHaveBeenCalledWith(1, {
        skip: 0,
        take: 20,
        projectId: 1,
        status: 0,
        assignedToUserId: 2,
      });
      expect(repository.count).toHaveBeenCalledWith(1, {
        projectId: 1,
        status: 0,
        assignedToUserId: 2,
      });
    });
  });

  describe('findById', () => {
    it('should return a task when found and account matches', async () => {
      repository.findById.mockResolvedValue(mockTask);

      const result = await service.findById(1, 1);

      expect(result).toEqual(mockTask);
      expect(repository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when task not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId does not match', async () => {
      repository.findById.mockResolvedValue(mockTask);

      await expect(service.findById(1, 999)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByProject', () => {
    it('should return tasks for a project', async () => {
      repository.findByProject.mockResolvedValue([mockTask]);

      const result = await service.findByProject(1, 1);

      expect(result).toEqual([mockTask]);
      expect(repository.findByProject).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    const createDto = {
      accountId: 1,
      projectId: 1,
      title: 'New Task',
    };

    it('should create and return a task', async () => {
      repository.create.mockResolvedValue(mockTask);

      const result = await service.create(createDto, 1, 1);

      expect(result).toEqual(mockTask);
      expect(repository.create).toHaveBeenCalledWith(createDto, 1);
    });

    it('should throw ForbiddenException when accountId does not match', async () => {
      await expect(service.create(createDto, 1, 999)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto = { title: 'Updated Task' };

    it('should update and return the task', async () => {
      repository.findById.mockResolvedValue(mockTask);
      repository.update.mockResolvedValue({ ...mockTask, title: 'Updated Task' });

      const result = await service.update(1, updateDto, 1);

      expect(result.title).toBe('Updated Task');
      expect(repository.update).toHaveBeenCalledWith(1, updateDto);
    });

    it('should throw NotFoundException when task not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(999, updateDto, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId does not match', async () => {
      repository.findById.mockResolvedValue(mockTask);

      await expect(service.update(1, updateDto, 999)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should soft delete the task', async () => {
      repository.findById.mockResolvedValue(mockTask);
      repository.softDelete.mockResolvedValue(undefined);

      await service.remove(1, 1);

      expect(repository.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when task not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId does not match', async () => {
      repository.findById.mockResolvedValue(mockTask);

      await expect(service.remove(1, 999)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getStats', () => {
    it('should return task statistics', async () => {
      const mockStats = { total: 10, new: 3, inProgress: 4, completed: 3 };
      repository.getStats.mockResolvedValue(mockStats);

      const result = await service.getStats(1);

      expect(result).toEqual(mockStats);
      expect(repository.getStats).toHaveBeenCalledWith(1, undefined);
    });

    it('should pass projectId filter when provided', async () => {
      const mockStats = { total: 5, new: 1, inProgress: 2, completed: 2 };
      repository.getStats.mockResolvedValue(mockStats);

      await service.getStats(1, 1);

      expect(repository.getStats).toHaveBeenCalledWith(1, 1);
    });
  });
});
