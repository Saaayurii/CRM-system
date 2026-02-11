import { Test, TestingModule } from '@nestjs/testing';
import { TaskTimeLogsController } from '../task-time-logs.controller';
import { TaskTimeLogsService } from '../task-time-logs.service';

describe('TaskTimeLogsController', () => {
  let controller: TaskTimeLogsController;
  let service: jest.Mocked<TaskTimeLogsService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };

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
      controllers: [TaskTimeLogsController],
      providers: [
        {
          provide: TaskTimeLogsService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TaskTimeLogsController>(TaskTimeLogsController);
    service = module.get(TaskTimeLogsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll with correct parameters', async () => {
      const mockResult = {
        data: [mockTimeLog],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockUser, 1, 20, 1, 1);

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 20, {
        taskId: 1,
        userId: 1,
      });
    });

    it('should use defaults when params not provided', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      service.findAll.mockResolvedValue(mockResult);

      await controller.findAll(mockUser);

      expect(service.findAll).toHaveBeenCalledWith(1, 20, {
        taskId: undefined,
        userId: undefined,
      });
    });
  });

  describe('findOne', () => {
    it('should call service.findById with id', async () => {
      service.findById.mockResolvedValue(mockTimeLog);

      const result = await controller.findOne(mockUser, 1);

      expect(result).toEqual(mockTimeLog);
      expect(service.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should call service.create with dto', async () => {
      const createDto = {
        taskId: 1,
        startTime: '2024-01-15T09:00:00Z',
        userId: 1,
        description: 'Worked on foundation',
      };
      service.create.mockResolvedValue(mockTimeLog);

      const result = await controller.create(mockUser, createDto);

      expect(result).toEqual(mockTimeLog);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto', async () => {
      const updateDto = { description: 'Updated description' };
      service.update.mockResolvedValue({
        ...mockTimeLog,
        description: 'Updated description',
      });

      const result = await controller.update(mockUser, 1, updateDto);

      expect(result.description).toBe('Updated description');
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(mockUser, 1);

      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});
