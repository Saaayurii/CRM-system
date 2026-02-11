import { Test, TestingModule } from '@nestjs/testing';
import { SupplierOrdersController } from '../supplier-orders.controller';
import { SupplierOrdersService } from '../supplier-orders.service';

describe('SupplierOrdersController', () => {
  let controller: SupplierOrdersController;
  let service: jest.Mocked<SupplierOrdersService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };
  const mockOrder = {
    id: 1,
    accountId: 1,
    orderNumber: 'ORD-001',
    status: 0,
    items: [],
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierOrdersController],
      providers: [
        {
          provide: SupplierOrdersService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            addItem: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SupplierOrdersController>(SupplierOrdersController);
    service = module.get(SupplierOrdersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll with correct params', async () => {
      const expected = { orders: [mockOrder], total: 1, page: 1, limit: 20 };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(mockUser, 1, 20);

      expect(result).toEqual(expected);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20, undefined);
    });
  });

  describe('findOne', () => {
    it('should call service.findById', async () => {
      service.findById.mockResolvedValue(mockOrder);

      const result = await controller.findOne(mockUser, 1);

      expect(result).toEqual(mockOrder);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should call service.create', async () => {
      const dto = {
        accountId: 1,
        supplierId: 1,
        orderNumber: 'ORD-002',
      } as any;
      service.create.mockResolvedValue(mockOrder);

      const result = await controller.create(mockUser, dto);

      expect(result).toEqual(mockOrder);
      expect(service.create).toHaveBeenCalledWith(dto, 1);
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const dto = { status: 1 } as any;
      service.update.mockResolvedValue({ ...mockOrder, status: 1 });

      await controller.update(mockUser, 1, dto);

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

  describe('addItem', () => {
    it('should call service.addItem', async () => {
      const dto = { materialId: 1, quantity: 10 } as any;
      service.addItem.mockResolvedValue({ id: 1 });

      await controller.addItem(mockUser, 1, dto);

      expect(service.addItem).toHaveBeenCalledWith(1, dto, 1);
    });
  });
});
