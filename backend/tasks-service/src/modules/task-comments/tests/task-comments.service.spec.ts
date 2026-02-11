import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TaskCommentsService } from '../task-comments.service';
import { TaskCommentRepository } from '../repositories/task-comment.repository';

describe('TaskCommentsService', () => {
  let service: TaskCommentsService;
  let repository: jest.Mocked<TaskCommentRepository>;

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
      providers: [
        TaskCommentsService,
        {
          provide: TaskCommentRepository,
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

    service = module.get<TaskCommentsService>(TaskCommentsService);
    repository = module.get(TaskCommentRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated task comments', async () => {
      const mockResult = { data: [mockComment], total: 1, page: 1, limit: 20, totalPages: 1 };
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
      const mockResult = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
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
    it('should return a task comment when found', async () => {
      repository.findById.mockResolvedValue(mockComment);

      const result = await service.findById(1);

      expect(result).toEqual(mockComment);
      expect(repository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when comment not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a task comment', async () => {
      const createDto = { taskId: 1, commentText: 'New comment', userId: 1 };
      repository.create.mockResolvedValue(mockComment);

      const result = await service.create(createDto);

      expect(result).toEqual(mockComment);
      expect(repository.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update and return the task comment', async () => {
      const updateDto = { commentText: 'Updated comment' };
      repository.findById.mockResolvedValue(mockComment);
      repository.update.mockResolvedValue({ ...mockComment, commentText: 'Updated comment' });

      const result = await service.update(1, updateDto);

      expect(result.commentText).toBe('Updated comment');
      expect(repository.update).toHaveBeenCalledWith(1, updateDto);
    });

    it('should throw NotFoundException when comment not found for update', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(999, { commentText: 'test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete the task comment', async () => {
      repository.findById.mockResolvedValue(mockComment);
      repository.delete.mockResolvedValue(undefined);

      await service.remove(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when comment not found for removal', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
