import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TrainingProgressService } from '../training-progress.service';
import { TrainingProgressRepository } from '../repositories/training-progress.repository';

describe('TrainingProgressService', () => {
  let service: TrainingProgressService;
  let repository: jest.Mocked<TrainingProgressRepository>;

  const mockProgress = {
    id: 1,
    userId: 1,
    trainingMaterialId: 1,
    status: 'in_progress',
    progressPercent: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockProgress],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingProgressService,
        {
          provide: TrainingProgressRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TrainingProgressService>(TrainingProgressService);
    repository = module.get(TrainingProgressRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated training progress', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await service.findAll(1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(repository.findAll).toHaveBeenCalledWith(1, 20, undefined, undefined);
    });

    it('should pass userId and trainingMaterialId filters', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      await service.findAll(1, 20, 5, 10);
      expect(repository.findAll).toHaveBeenCalledWith(1, 20, 5, 10);
    });
  });

  describe('findById', () => {
    it('should return a training progress by id', async () => {
      repository.findById.mockResolvedValue(mockProgress);
      const result = await service.findById(1);
      expect(result).toEqual(mockProgress);
      expect(repository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when progress not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a training progress record', async () => {
      const dto = { userId: 1, trainingMaterialId: 1, status: 'in_progress' };
      repository.create.mockResolvedValue({ ...mockProgress, ...dto });
      const result = await service.create(dto as any);
      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should update a training progress record', async () => {
      const dto = { progressPercent: 100, status: 'completed' };
      repository.findById.mockResolvedValue(mockProgress);
      repository.update.mockResolvedValue({ ...mockProgress, ...dto });
      const result = await service.update(1, dto as any);
      expect(result.progressPercent).toBe(100);
      expect(repository.update).toHaveBeenCalledWith(1, dto);
    });

    it('should throw NotFoundException when updating non-existent progress', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update(999, { status: 'completed' } as any)).rejects.toThrow(NotFoundException);
    });
  });
});
