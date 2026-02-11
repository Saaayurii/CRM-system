import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { WarehousesService } from '../warehouses.service';
import { WarehouseRepository } from '../repositories/warehouse.repository';

describe('WarehousesService', () => {
  let service: WarehousesService;
  let repository: jest.Mocked<WarehouseRepository>;

  const now = new Date();
  const mockWarehouse = {
    id: 1,
    accountId: 1,
    name: 'Main Warehouse',
    code: 'WH-001',
    warehouseType: 'general',
    address: '123 St',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const mockInventoryCheck = {
    id: 1,
    warehouseId: 1,
    checkNumber: 'CHK-001',
    status: 0,
    createdAt: now,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehousesService,
        {
          provide: WarehouseRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            findStock: jest.fn(),
            createMovement: jest.fn(),
            findAllInventoryChecks: jest.fn(),
            findInventoryCheckById: jest.fn(),
            findInventoryCheckByNumber: jest.fn(),
            createInventoryCheck: jest.fn(),
            updateInventoryCheck: jest.fn(),
            countInventoryChecks: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WarehousesService>(WarehousesService);
    repository = module.get(WarehouseRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated warehouses', async () => {
      repository.findAll.mockResolvedValue([mockWarehouse]);
      repository.count.mockResolvedValue(1);

      const result = await service.findAll(1, 1, 20);

      expect(result).toEqual({
        warehouses: [mockWarehouse],
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(repository.findAll).toHaveBeenCalledWith(1, { skip: 0, take: 20 });
    });
  });

  describe('findById', () => {
    it('should return a warehouse by id', async () => {
      repository.findById.mockResolvedValue(mockWarehouse);

      const result = await service.findById(1, 1);

      expect(result).toEqual(mockWarehouse);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      repository.findById.mockResolvedValue(mockWarehouse);

      await expect(service.findById(1, 999)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('create', () => {
    it('should create a warehouse', async () => {
      const dto = { accountId: 1, name: 'New WH' } as any;
      repository.create.mockResolvedValue({ ...mockWarehouse, name: 'New WH' });

      const result = await service.create(dto, 1);

      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(dto);
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      const dto = { accountId: 2, name: 'New WH' } as any;

      await expect(service.create(dto, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update a warehouse', async () => {
      const dto = { name: 'Updated WH' } as any;
      repository.findById.mockResolvedValue(mockWarehouse);
      repository.update.mockResolvedValue({
        ...mockWarehouse,
        name: 'Updated WH',
      });

      const result = await service.update(1, dto, 1);

      expect(result.name).toBe('Updated WH');
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(999, {} as any, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      repository.findById.mockResolvedValue(mockWarehouse);

      await expect(service.update(1, {} as any, 999)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a warehouse', async () => {
      repository.findById.mockResolvedValue(mockWarehouse);
      repository.delete.mockResolvedValue(undefined);

      await service.remove(1, 1);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStock', () => {
    it('should return warehouse stock', async () => {
      const mockStock = [{ id: 1, materialId: 1, quantity: 100 }];
      repository.findById.mockResolvedValue(mockWarehouse);
      repository.findStock.mockResolvedValue(mockStock);

      const result = await service.getStock(1, 1);

      expect(result).toEqual(mockStock);
      expect(repository.findStock).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getStock(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createMovement', () => {
    it('should create a warehouse movement', async () => {
      const dto = {
        accountId: 1,
        warehouseId: 1,
        materialId: 1,
        movementType: 'in',
        quantity: 50,
      } as any;
      repository.createMovement.mockResolvedValue({ id: 1, ...dto });

      const result = await service.createMovement(dto, 1);

      expect(result).toBeDefined();
      expect(repository.createMovement).toHaveBeenCalledWith(dto);
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      const dto = { accountId: 2, warehouseId: 1 } as any;

      await expect(service.createMovement(dto, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('createInventoryCheck', () => {
    it('should create an inventory check', async () => {
      const dto = {
        warehouseId: 1,
        checkNumber: 'CHK-002',
        checkDate: now.toISOString(),
      } as any;
      repository.findById.mockResolvedValue(mockWarehouse);
      repository.findInventoryCheckByNumber.mockResolvedValue(null);
      repository.createInventoryCheck.mockResolvedValue({ id: 2, ...dto });

      const result = await service.createInventoryCheck(dto, 1);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      const dto = { warehouseId: 999, checkNumber: 'CHK-002' } as any;
      repository.findById.mockResolvedValue(null);

      await expect(service.createInventoryCheck(dto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when check number exists', async () => {
      const dto = { warehouseId: 1, checkNumber: 'CHK-001' } as any;
      repository.findById.mockResolvedValue(mockWarehouse);
      repository.findInventoryCheckByNumber.mockResolvedValue(
        mockInventoryCheck,
      );

      await expect(service.createInventoryCheck(dto, 1)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
