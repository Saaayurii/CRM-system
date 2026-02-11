import { Test, TestingModule } from '@nestjs/testing';
import { TaskStatusHistoryController } from '../task-status-history.controller';
import { TaskStatusHistoryService } from '../task-status-history.service';

describe('TaskStatusHistoryController', () => {
  let controller: TaskStatusHistoryController;
  let service: jest.Mocked<TaskStatusHistoryService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };

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
      controllers: [TaskStatusHistoryController],
      providers: [
        {
          provide: TaskStatusHistoryService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TaskStatusHistoryController>(
      TaskStatusHistoryController,
    );
    service = module.get(TaskStatusHistoryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll with correct parameters', async () => {
      const mockResult = {
        data: [mockRecord],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockUser, 1, 20, 1);

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 20, { taskId: 1 });
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
      });
    });
  });

  describe('findOne', () => {
    it('should call service.findById with id', async () => {
      service.findById.mockResolvedValue(mockRecord);

      const result = await controller.findOne(mockUser, 1);

      expect(result).toEqual(mockRecord);
      expect(service.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should call service.create with dto', async () => {
      const createDto = {
        taskId: 1,
        oldStatus: 0,
        newStatus: 1,
        changedByUserId: 1,
        changeReason: 'Started work',
      };
      service.create.mockResolvedValue(mockRecord);

      const result = await controller.create(mockUser, createDto);

      expect(result).toEqual(mockRecord);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });
});
