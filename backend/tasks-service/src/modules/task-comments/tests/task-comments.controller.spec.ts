import { Test, TestingModule } from '@nestjs/testing';
import { TaskCommentsController } from '../task-comments.controller';
import { TaskCommentsService } from '../task-comments.service';

describe('TaskCommentsController', () => {
  let controller: TaskCommentsController;
  let service: jest.Mocked<TaskCommentsService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };

  const mockComment = {
    id: 1,
    taskId: 1,
    userId: 1,
    commentText: 'Test comment',
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskCommentsController],
      providers: [
        {
          provide: TaskCommentsService,
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

    controller = module.get<TaskCommentsController>(TaskCommentsController);
    service = module.get(TaskCommentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll with correct parameters', async () => {
      const mockResult = { data: [mockComment], total: 1, page: 1, limit: 20, totalPages: 1 };
      service.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockUser, 1, 20, 1);

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 20, { taskId: 1 });
    });

    it('should use defaults when params not provided', async () => {
      const mockResult = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      service.findAll.mockResolvedValue(mockResult);

      await controller.findAll(mockUser);

      expect(service.findAll).toHaveBeenCalledWith(1, 20, { taskId: undefined });
    });
  });

  describe('findOne', () => {
    it('should call service.findById with id', async () => {
      service.findById.mockResolvedValue(mockComment);

      const result = await controller.findOne(mockUser, 1);

      expect(result).toEqual(mockComment);
      expect(service.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should call service.create with dto', async () => {
      const createDto = { taskId: 1, commentText: 'New comment' };
      service.create.mockResolvedValue(mockComment);

      const result = await controller.create(mockUser, createDto);

      expect(result).toEqual(mockComment);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto', async () => {
      const updateDto = { commentText: 'Updated comment' };
      service.update.mockResolvedValue({ ...mockComment, commentText: 'Updated comment' });

      const result = await controller.update(mockUser, 1, updateDto);

      expect(result.commentText).toBe('Updated comment');
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
