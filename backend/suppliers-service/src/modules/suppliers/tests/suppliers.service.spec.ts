import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { SuppliersService } from '../suppliers.service';
import { SupplierRepository } from '../repositories/supplier.repository';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let repository: jest.Mocked<SupplierRepository>;

  const now = new Date();
  const mockSupplier = {
    id: 1,
    accountId: 1,
    name: 'Test Supplier',
    legalName: 'Test Supplier LLC',
    inn: '1234567890',
    kpp: '123456789',
    contactPerson: 'John',
    phone: '+7999',
    email: 'supplier@test.com',
    website: 'http://test.com',
    legalAddress: '123 St',
    warehouseAddress: '456 St',
    paymentTerms: 'net30',
    deliveryTimeDays: 5,
    minOrderAmount: 1000,
    rating: 4.5,
    reliabilityScore: 90,
    status: 1,
    isVerified: true,
    notes: 'notes',
    documents: [],
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        {
          provide: SupplierRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            count: jest.fn(),
            findMaterials: jest.fn(),
            createMaterial: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
    repository = module.get(SupplierRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated suppliers', async () => {
      repository.findAll.mockResolvedValue([mockSupplier]);
      repository.count.mockResolvedValue(1);

      const result = await service.findAll(1, 1, 20);

      expect(result.total).toBe(1);
      expect(result.suppliers).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should pass status filter', async () => {
      repository.findAll.mockResolvedValue([]);
      repository.count.mockResolvedValue(0);

      await service.findAll(1, 1, 20, 1);

      expect(repository.findAll).toHaveBeenCalledWith(1, {
        skip: 0,
        take: 20,
        status: 1,
      });
      expect(repository.count).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('findById', () => {
    it('should return a supplier by id', async () => {
      repository.findById.mockResolvedValue(mockSupplier);

      const result = await service.findById(1, 1);

      expect(result.id).toBe(1);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      repository.findById.mockResolvedValue(mockSupplier);

      await expect(service.findById(1, 999)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('create', () => {
    it('should create a supplier', async () => {
      const dto = { accountId: 1, name: 'New Supplier' } as any;
      repository.create.mockResolvedValue({
        ...mockSupplier,
        name: 'New Supplier',
      });

      const result = await service.create(dto, 1);

      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(dto);
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      const dto = { accountId: 2, name: 'New Supplier' } as any;

      await expect(service.create(dto, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update a supplier', async () => {
      const dto = { name: 'Updated' } as any;
      repository.findById.mockResolvedValue(mockSupplier);
      repository.update.mockResolvedValue({ ...mockSupplier, name: 'Updated' });

      const result = await service.update(1, dto, 1);

      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(999, {} as any, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      repository.findById.mockResolvedValue(mockSupplier);

      await expect(service.update(1, {} as any, 999)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a supplier', async () => {
      repository.findById.mockResolvedValue(mockSupplier);
      repository.softDelete.mockResolvedValue(undefined);

      await service.remove(1, 1);

      expect(repository.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      repository.findById.mockResolvedValue(mockSupplier);

      await expect(service.remove(1, 999)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getMaterials', () => {
    it('should return supplier materials', async () => {
      const mockMaterials = [{ id: 1, supplierId: 1, materialId: 1 }];
      repository.findById.mockResolvedValue(mockSupplier);
      repository.findMaterials.mockResolvedValue(mockMaterials);

      const result = await service.getMaterials(1, 1);

      expect(result).toEqual(mockMaterials);
    });

    it('should throw NotFoundException when supplier not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getMaterials(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addMaterial', () => {
    it('should add a material to supplier', async () => {
      const dto = { materialId: 1, price: 100 } as any;
      repository.findById.mockResolvedValue(mockSupplier);
      repository.createMaterial.mockResolvedValue({
        id: 1,
        supplierId: 1,
        materialId: 1,
      });

      const result = await service.addMaterial(1, dto, 1);

      expect(result).toBeDefined();
      expect(repository.createMaterial).toHaveBeenCalledWith(1, dto);
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      repository.findById.mockResolvedValue(mockSupplier);

      await expect(service.addMaterial(1, {} as any, 999)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
