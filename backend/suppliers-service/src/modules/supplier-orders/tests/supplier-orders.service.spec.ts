import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupplierOrdersService } from '../supplier-orders.service';
import { SupplierOrderRepository } from '../repositories/supplier-order.repository';

describe('SupplierOrdersService', () => {
  let service: SupplierOrdersService;
  let repository: jest.Mocked<SupplierOrderRepository>;

  const now = new Date();
  const mockOrder = {
    id: 1,
    accountId: 1,
    supplierId: 1,
    orderNumber: 'ORD-001',
    orderDate: now,
    status: 0,
    totalAmount: 5000,
    currency: 'RUB',
    items: [],
    supplier: { id: 1, name: 'Supplier' },
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierOrdersService,
        {
          provide: SupplierOrderRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            count: jest.fn(),
            createItem: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SupplierOrdersService>(SupplierOrdersService);
    repository = module.get(SupplierOrderRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated orders', async () => {
      repository.findAll.mockResolvedValue([mockOrder]);
      repository.count.mockResolvedValue(1);

      const result = await service.findAll(1, 1, 20);

      expect(result).toEqual({
        orders: [mockOrder],
        total: 1,
        page: 1,
        limit: 20,
      });
    });

    it('should pass status filter', async () => {
      repository.findAll.mockResolvedValue([]);
      repository.count.mockResolvedValue(0);

      await service.findAll(1, 1, 20, 2);

      expect(repository.findAll).toHaveBeenCalledWith(1, { skip: 0, take: 20, status: 2 });
      expect(repository.count).toHaveBeenCalledWith(1, 2);
    });
  });

  describe('findById', () => {
    it('should return an order by id', async () => {
      repository.findById.mockResolvedValue(mockOrder);

      const result = await service.findById(1, 1);

      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      repository.findById.mockResolvedValue(mockOrder);

      await expect(service.findById(1, 999)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('should create a supplier order', async () => {
      const dto = { accountId: 1, supplierId: 1, orderNumber: 'ORD-002', orderDate: now.toISOString() } as any;
      repository.create.mockResolvedValue({ ...mockOrder, orderNumber: 'ORD-002' });

      const result = await service.create(dto, 1);

      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(dto);
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      const dto = { accountId: 2, supplierId: 1 } as any;

      await expect(service.create(dto, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update a supplier order', async () => {
      const dto = { status: 1 } as any;
      repository.findById.mockResolvedValue(mockOrder);
      repository.update.mockResolvedValue({ ...mockOrder, status: 1 });

      const result = await service.update(1, dto, 1);

      expect(result.status).toBe(1);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(999, {} as any, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      repository.findById.mockResolvedValue(mockOrder);

      await expect(service.update(1, {} as any, 999)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should soft delete an order', async () => {
      repository.findById.mockResolvedValue(mockOrder);
      repository.softDelete.mockResolvedValue(undefined);

      await service.remove(1, 1);

      expect(repository.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      repository.findById.mockResolvedValue(mockOrder);

      await expect(service.remove(1, 999)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addItem', () => {
    it('should add an item to order', async () => {
      const dto = { materialId: 1, quantity: 10, unit: 'kg', unitPrice: 100, totalPrice: 1000 } as any;
      repository.findById.mockResolvedValue(mockOrder);
      repository.createItem.mockResolvedValue({ id: 1, supplierOrderId: 1 });

      const result = await service.addItem(1, dto, 1);

      expect(result).toBeDefined();
      expect(repository.createItem).toHaveBeenCalledWith(1, dto);
    });

    it('should throw NotFoundException when order not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.addItem(999, {} as any, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      repository.findById.mockResolvedValue(mockOrder);

      await expect(service.addItem(1, {} as any, 999)).rejects.toThrow(ForbiddenException);
    });
  });
});
