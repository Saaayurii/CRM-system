import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from '../tasks.controller';
import { TasksService } from '../tasks.service';

describe('TasksController', () => {
  let controller: TasksController;
  let service: jest.Mocked<TasksService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };

  const mockTask = {
    id: 1,
    accountId: 1,
    projectId: 1,
    title: 'Test Task',
    status: 0,
    priority: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            findByProject: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            getStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    service = module.get(TasksService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll with correct parameters', async () => {
      const mockResult = { tasks: [mockTask], total: 1, page: 1, limit: 20 };
      service.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockUser, 1, 20, 1, 0, 2);

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20, {
        projectId: 1,
        status: 0,
        assignedToUserId: 2,
      });
    });

    it('should use default values when params not provided', async () => {
      const mockResult = { tasks: [], total: 0, page: 1, limit: 20 };
      service.findAll.mockResolvedValue(mockResult);

      await controller.findAll(mockUser);

      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20, {
        projectId: undefined,
        status: undefined,
        assignedToUserId: undefined,
      });
    });
  });

  describe('getStats', () => {
    it('should call service.getStats with accountId and optional projectId', async () => {
      const mockStats = { total: 10, new: 3, inProgress: 4, completed: 3 };
      service.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockUser, 1);

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('findByProject', () => {
    it('should call service.findByProject with projectId and accountId', async () => {
      service.findByProject.mockResolvedValue([mockTask]);

      const result = await controller.findByProject(mockUser, 1);

      expect(result).toEqual([mockTask]);
      expect(service.findByProject).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('findOne', () => {
    it('should call service.findById with id and accountId', async () => {
      service.findById.mockResolvedValue(mockTask);

      const result = await controller.findOne(mockUser, 1);

      expect(result).toEqual(mockTask);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should call service.create with dto, userId and accountId', async () => {
      const createDto = { accountId: 1, projectId: 1, title: 'New Task' };
      service.create.mockResolvedValue(mockTask);

      const result = await controller.create(mockUser, createDto);

      expect(result).toEqual(mockTask);
      expect(service.create).toHaveBeenCalledWith(createDto, 1, 1);
    });
  });

  describe('update', () => {
    it('should call service.update with id, dto and accountId', async () => {
      const updateDto = { title: 'Updated Task' };
      service.update.mockResolvedValue({ ...mockTask, title: 'Updated Task' });

      const result = await controller.update(mockUser, 1, updateDto);

      expect(result.title).toBe('Updated Task');
      expect(service.update).toHaveBeenCalledWith(1, updateDto, 1);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id and accountId', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(mockUser, 1);

      expect(service.remove).toHaveBeenCalledWith(1, 1);
    });
  });
});
