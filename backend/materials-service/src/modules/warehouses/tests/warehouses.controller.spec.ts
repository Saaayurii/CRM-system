import { Test, TestingModule } from '@nestjs/testing';
import { WarehousesController } from '../warehouses.controller';
import { WarehousesService } from '../warehouses.service';

describe('WarehousesController', () => {
  let controller: WarehousesController;
  let service: jest.Mocked<WarehousesService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };
  const mockWarehouse = {
    id: 1,
    accountId: 1,
    name: 'Main Warehouse',
    code: 'WH-001',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WarehousesController],
      providers: [
        {
          provide: WarehousesService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            getStock: jest.fn(),
            createMovement: jest.fn(),
            findAllInventoryChecks: jest.fn(),
            findInventoryCheckById: jest.fn(),
            createInventoryCheck: jest.fn(),
            updateInventoryCheck: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WarehousesController>(WarehousesController);
    service = module.get(WarehousesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll with correct params', async () => {
      const expected = { warehouses: [mockWarehouse], total: 1, page: 1, limit: 20 };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(mockUser, 1, 20);

      expect(result).toEqual(expected);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findOne', () => {
    it('should call service.findById', async () => {
      service.findById.mockResolvedValue(mockWarehouse);

      const result = await controller.findOne(mockUser, 1);

      expect(result).toEqual(mockWarehouse);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should call service.create', async () => {
      const dto = { accountId: 1, name: 'New WH' } as any;
      service.create.mockResolvedValue(mockWarehouse);

      const result = await controller.create(mockUser, dto);

      expect(result).toEqual(mockWarehouse);
      expect(service.create).toHaveBeenCalledWith(dto, 1);
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const dto = { name: 'Updated' } as any;
      service.update.mockResolvedValue({ ...mockWarehouse, name: 'Updated' });

      const result = await controller.update(mockUser, 1, dto);

      expect(service.update).toHaveBeenCalledWith(1, dto, 1);
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(mockUser, 1);

      expect(service.remove).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('getStock', () => {
    it('should call service.getStock', async () => {
      const stock = [{ id: 1, materialId: 1, quantity: 50 }];
      service.getStock.mockResolvedValue(stock);

      const result = await controller.getStock(mockUser, 1);

      expect(result).toEqual(stock);
      expect(service.getStock).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('createMovement', () => {
    it('should call service.createMovement', async () => {
      const dto = { accountId: 1, warehouseId: 1, materialId: 1 } as any;
      service.createMovement.mockResolvedValue({ id: 1 });

      const result = await controller.createMovement(mockUser, dto);

      expect(service.createMovement).toHaveBeenCalledWith(dto, 1);
    });
  });
});
