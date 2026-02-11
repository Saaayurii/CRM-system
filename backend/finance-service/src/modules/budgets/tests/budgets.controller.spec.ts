import { Test, TestingModule } from '@nestjs/testing';
import { BudgetsController } from '../budgets.controller';
import { BudgetsService } from '../budgets.service';

describe('BudgetsController', () => {
  let controller: BudgetsController;
  let service: jest.Mocked<BudgetsService>;

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
      controllers: [BudgetsController],
      providers: [
        {
          provide: BudgetsService,
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

    controller = module.get<BudgetsController>(BudgetsController);
    service = module.get(BudgetsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should delegate to service.findAll', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await controller.findAll(1, 1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findOne', () => {
    it('should delegate to service.findById', async () => {
      service.findById.mockResolvedValue(mockBudget);
      const result = await controller.findOne(1, 1);
      expect(result).toEqual(mockBudget);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should delegate to service.create', async () => {
      const dto = { name: 'Q1 Budget', totalAmount: 50000 } as any;
      service.create.mockResolvedValue(mockBudget);
      const result = await controller.create(dto, 1, 1);
      expect(result).toEqual(mockBudget);
      expect(service.create).toHaveBeenCalledWith(1, dto, 1);
    });
  });

  describe('update', () => {
    it('should delegate to service.update', async () => {
      const dto = { name: 'Updated Budget' } as any;
      service.update.mockResolvedValue({ ...mockBudget, name: 'Updated Budget' });
      const result = await controller.update(1, dto, 1);
      expect(service.update).toHaveBeenCalledWith(1, 1, dto);
    });
  });

  describe('remove', () => {
    it('should delegate to service.delete', async () => {
      service.delete.mockResolvedValue({ count: 1 } as any);
      await controller.remove(1, 1);
      expect(service.delete).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('createItem', () => {
    it('should delegate to service.createItem', async () => {
      const dto = { description: 'Office supplies', amount: 500 } as any;
      const mockItem = { id: 1, budgetId: 1, ...dto };
      service.createItem.mockResolvedValue(mockItem);
      const result = await controller.createItem(1, dto, 1);
      expect(result).toEqual(mockItem);
      expect(service.createItem).toHaveBeenCalledWith(1, 1, dto);
    });
  });
});
