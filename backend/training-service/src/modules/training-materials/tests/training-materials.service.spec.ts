import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TrainingMaterialsService } from '../training-materials.service';
import { TrainingMaterialRepository } from '../repositories/training-material.repository';

describe('TrainingMaterialsService', () => {
  let service: TrainingMaterialsService;
  let repository: jest.Mocked<TrainingMaterialRepository>;

  const mockMaterial = {
    id: 1,
    accountId: 1,
    title: 'Test Material',
    category: 'onboarding',
    content: 'Some content',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockMaterial],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingMaterialsService,
        {
          provide: TrainingMaterialRepository,
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

    service = module.get<TrainingMaterialsService>(TrainingMaterialsService);
    repository = module.get(TrainingMaterialRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated training materials', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await service.findAll(1, 1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, undefined);
    });

    it('should pass category filter to repository', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      await service.findAll(1, 1, 20, 'onboarding');
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, 'onboarding');
    });
  });

  describe('findById', () => {
    it('should return a training material by id', async () => {
      repository.findById.mockResolvedValue(mockMaterial);
      const result = await service.findById(1, 1);
      expect(result).toEqual(mockMaterial);
      expect(repository.findById).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when material not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a training material', async () => {
      const dto = { title: 'New Material', content: 'Content', category: 'onboarding' };
      repository.create.mockResolvedValue({ ...mockMaterial, ...dto });
      const result = await service.create(1, dto as any);
      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('update', () => {
    it('should update a training material', async () => {
      const dto = { title: 'Updated' };
      repository.findById.mockResolvedValue(mockMaterial);
      repository.update.mockResolvedValue({ ...mockMaterial, ...dto });
      const result = await service.update(1, 1, dto as any);
      expect(result.title).toBe('Updated');
      expect(repository.update).toHaveBeenCalledWith(1, 1, dto);
    });

    it('should throw NotFoundException when updating non-existent material', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update(999, 1, { title: 'X' } as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a training material', async () => {
      repository.findById.mockResolvedValue(mockMaterial);
      repository.delete.mockResolvedValue({ count: 1 });
      await service.delete(1, 1);
      expect(repository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when deleting non-existent material', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
