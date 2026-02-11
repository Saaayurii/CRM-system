import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BudgetsService } from '../budgets.service';
import { BudgetRepository } from '../repositories/budget.repository';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let repository: jest.Mocked<BudgetRepository>;

  const mockBudget = {
    id: 1,
    accountId: 1,
    name: 'Q1 Budget',
    totalAmount: 50000,
    createdByUserId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
  };

  const mockPaginatedResult = {
    data: [mockBudget],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        {
          provide: BudgetRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createItem: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
    repository = module.get(BudgetRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated budgets', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await service.findAll(1, 1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findById', () => {
    it('should return a budget when found', async () => {
      repository.findById.mockResolvedValue(mockBudget);
      const result = await service.findById(1, 1);
      expect(result).toEqual(mockBudget);
      expect(repository.findById).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when budget not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a new budget', async () => {
      const dto = { name: 'Q1 Budget', totalAmount: 50000 } as any;
      repository.create.mockResolvedValue(mockBudget);
      const result = await service.create(1, dto, 1);
      expect(result).toEqual(mockBudget);
      expect(repository.create).toHaveBeenCalledWith(1, dto, 1);
    });
  });

  describe('update', () => {
    it('should update and return the budget', async () => {
      const dto = { name: 'Updated Budget' } as any;
      const updatedBudget = { ...mockBudget, name: 'Updated Budget' };
      repository.findById.mockResolvedValue(mockBudget);
      repository.update.mockResolvedValue(updatedBudget);
      const result = await service.update(1, 1, dto);
      expect(result).toEqual(updatedBudget);
      expect(repository.update).toHaveBeenCalledWith(1, 1, dto);
    });

    it('should throw NotFoundException when updating non-existent budget', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update(999, 1, {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete the budget', async () => {
      repository.findById.mockResolvedValue(mockBudget);
      repository.delete.mockResolvedValue({ count: 1 } as any);
      await service.delete(1, 1);
      expect(repository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when deleting non-existent budget', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createItem', () => {
    it('should create an item for an existing budget', async () => {
      const dto = { description: 'Office supplies', amount: 500 } as any;
      const mockItem = { id: 1, budgetId: 1, ...dto };
      repository.findById.mockResolvedValue(mockBudget);
      repository.createItem.mockResolvedValue(mockItem);
      const result = await service.createItem(1, 1, dto);
      expect(result).toEqual(mockItem);
      expect(repository.createItem).toHaveBeenCalledWith(1, dto);
    });

    it('should throw NotFoundException when adding item to non-existent budget', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.createItem(999, 1, {} as any)).rejects.toThrow(NotFoundException);
    });
  });
});
