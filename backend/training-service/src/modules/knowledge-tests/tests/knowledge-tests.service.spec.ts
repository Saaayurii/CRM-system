import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { KnowledgeTestsService } from '../knowledge-tests.service';
import { KnowledgeTestRepository } from '../repositories/knowledge-test.repository';

describe('KnowledgeTestsService', () => {
  let service: KnowledgeTestsService;
  let repository: jest.Mocked<KnowledgeTestRepository>;

  const mockTest = {
    id: 1,
    accountId: 1,
    title: 'Test Quiz',
    description: 'A quiz about training',
    questions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockTest],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeTestsService,
        {
          provide: KnowledgeTestRepository,
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

    service = module.get<KnowledgeTestsService>(KnowledgeTestsService);
    repository = module.get(KnowledgeTestRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated knowledge tests', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await service.findAll(1, 1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findById', () => {
    it('should return a knowledge test by id', async () => {
      repository.findById.mockResolvedValue(mockTest);
      const result = await service.findById(1, 1);
      expect(result).toEqual(mockTest);
      expect(repository.findById).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when test not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a knowledge test', async () => {
      const dto = { title: 'New Test', description: 'Description', questions: [] };
      repository.create.mockResolvedValue({ ...mockTest, ...dto });
      const result = await service.create(1, dto as any);
      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('update', () => {
    it('should update a knowledge test', async () => {
      const dto = { title: 'Updated Test' };
      repository.findById.mockResolvedValue(mockTest);
      repository.update.mockResolvedValue({ ...mockTest, ...dto });
      const result = await service.update(1, 1, dto as any);
      expect(result.title).toBe('Updated Test');
      expect(repository.update).toHaveBeenCalledWith(1, 1, dto);
    });

    it('should throw NotFoundException when updating non-existent test', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update(999, 1, { title: 'X' } as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a knowledge test', async () => {
      repository.findById.mockResolvedValue(mockTest);
      repository.delete.mockResolvedValue({ count: 1 });
      await service.delete(1, 1);
      expect(repository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when deleting non-existent test', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
