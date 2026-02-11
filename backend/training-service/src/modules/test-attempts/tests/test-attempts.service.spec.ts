import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TestAttemptsService } from '../test-attempts.service';
import { TestAttemptRepository } from '../repositories/test-attempt.repository';

describe('TestAttemptsService', () => {
  let service: TestAttemptsService;
  let repository: jest.Mocked<TestAttemptRepository>;

  const mockAttempt = {
    id: 1,
    knowledgeTestId: 1,
    userId: 1,
    score: 85,
    answers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockAttempt],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestAttemptsService,
        {
          provide: TestAttemptRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TestAttemptsService>(TestAttemptsService);
    repository = module.get(TestAttemptRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated test attempts', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await service.findAll(1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(repository.findAll).toHaveBeenCalledWith(
        1,
        20,
        undefined,
        undefined,
      );
    });

    it('should pass knowledgeTestId and userId filters', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      await service.findAll(1, 20, 5, 10);
      expect(repository.findAll).toHaveBeenCalledWith(1, 20, 5, 10);
    });
  });

  describe('findById', () => {
    it('should return a test attempt by id', async () => {
      repository.findById.mockResolvedValue(mockAttempt);
      const result = await service.findById(1);
      expect(result).toEqual(mockAttempt);
      expect(repository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when attempt not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });

    it('should include the id in the error message', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(42)).rejects.toThrow(
        'Test attempt #42 not found',
      );
    });
  });

  describe('create', () => {
    it('should create a test attempt', async () => {
      const dto = { knowledgeTestId: 1, userId: 1, score: 90, answers: [] };
      repository.create.mockResolvedValue({ ...mockAttempt, ...dto });
      const result = await service.create(dto as any);
      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(dto);
    });
  });
});
