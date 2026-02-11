import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersController } from '../suppliers.controller';
import { SuppliersService } from '../suppliers.service';

describe('SuppliersController', () => {
  let controller: SuppliersController;
  let service: jest.Mocked<SuppliersService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };
  const mockSupplier = {
    id: 1,
    accountId: 1,
    name: 'Supplier',
    legalName: 'Supplier LLC',
    inn: '123',
    kpp: '456',
    contactPerson: 'John',
    phone: '+7999',
    email: 's@t.com',
    website: null,
    legalAddress: '123 St',
    warehouseAddress: null,
    paymentTerms: 'net30',
    deliveryTimeDays: 5,
    minOrderAmount: undefined,
    rating: undefined,
    reliabilityScore: 90,
    status: 1,
    isVerified: true,
    notes: null,
    documents: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [
        {
          provide: SuppliersService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            getMaterials: jest.fn(),
            addMaterial: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SuppliersController>(SuppliersController);
    service = module.get(SuppliersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll with correct params', async () => {
      const expected = {
        suppliers: [mockSupplier],
        total: 1,
        page: 1,
        limit: 20,
      };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(mockUser, 1, 20);

      expect(result).toEqual(expected);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20, undefined);
    });
  });

  describe('findOne', () => {
    it('should call service.findById', async () => {
      service.findById.mockResolvedValue(mockSupplier);

      const result = await controller.findOne(mockUser, 1);

      expect(result).toEqual(mockSupplier);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should call service.create', async () => {
      const dto = { accountId: 1, name: 'New' } as any;
      service.create.mockResolvedValue(mockSupplier);

      const result = await controller.create(mockUser, dto);

      expect(result).toEqual(mockSupplier);
      expect(service.create).toHaveBeenCalledWith(dto, 1);
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const dto = { name: 'Updated' } as any;
      service.update.mockResolvedValue({ ...mockSupplier, name: 'Updated' });

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

  describe('getMaterials', () => {
    it('should call service.getMaterials', async () => {
      const materials = [{ id: 1, supplierId: 1 }];
      service.getMaterials.mockResolvedValue(materials);

      const result = await controller.getMaterials(mockUser, 1);

      expect(result).toEqual(materials);
      expect(service.getMaterials).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('addMaterial', () => {
    it('should call service.addMaterial', async () => {
      const dto = { materialId: 1, price: 100 } as any;
      service.addMaterial.mockResolvedValue({ id: 1 });

      await controller.addMaterial(mockUser, 1, dto);

      expect(service.addMaterial).toHaveBeenCalledWith(1, dto, 1);
    });
  });
});
