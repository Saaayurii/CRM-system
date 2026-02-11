import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BonusesService } from '../bonuses.service';
import { BonusRepository } from '../repositories/bonus.repository';

describe('BonusesService', () => {
  let service: BonusesService;
  let repository: jest.Mocked<BonusRepository>;

  const mockBonus = {
    id: 1,
    accountId: 1,
    userId: 10,
    amount: 5000,
    status: 1,
    projectId: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockBonus],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BonusesService,
        {
          provide: BonusRepository,
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

    service = module.get<BonusesService>(BonusesService);
    repository = module.get(BonusRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated bonuses', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await service.findAll(1, 1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, undefined);
    });

    it('should pass filters to repository', async () => {
      const filters = { userId: 10, projectId: 2, status: 1 };
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      await service.findAll(1, 1, 20, filters);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, filters);
    });
  });

  describe('findById', () => {
    it('should return a bonus when found', async () => {
      repository.findById.mockResolvedValue(mockBonus);
      const result = await service.findById(1, 1);
      expect(result).toEqual(mockBonus);
      expect(repository.findById).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when bonus not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a new bonus', async () => {
      const dto = { userId: 10, amount: 5000 } as any;
      repository.create.mockResolvedValue(mockBonus);
      const result = await service.create(1, dto);
      expect(result).toEqual(mockBonus);
      expect(repository.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('update', () => {
    it('should update and return the bonus', async () => {
      const dto = { amount: 6000 } as any;
      const updatedBonus = { ...mockBonus, amount: 6000 };
      repository.findById.mockResolvedValue(mockBonus);
      repository.update.mockResolvedValue(updatedBonus);
      const result = await service.update(1, 1, dto);
      expect(result).toEqual(updatedBonus);
      expect(repository.update).toHaveBeenCalledWith(1, 1, dto);
    });

    it('should throw NotFoundException when updating non-existent bonus', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update(999, 1, {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete the bonus', async () => {
      repository.findById.mockResolvedValue(mockBonus);
      repository.delete.mockResolvedValue({ count: 1 } as any);
      await service.delete(1, 1);
      expect(repository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when deleting non-existent bonus', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
