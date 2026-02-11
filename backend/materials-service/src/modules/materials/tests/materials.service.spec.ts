import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { MaterialsService } from '../materials.service';
import { MaterialRepository } from '../repositories/material.repository';

describe('MaterialsService', () => {
  let service: MaterialsService;
  let repository: jest.Mocked<MaterialRepository>;

  const now = new Date();
  const mockMaterial = {
    id: 1,
    accountId: 1,
    categoryId: 1,
    category: { id: 1, name: 'Category A', code: 'CAT-A' },
    name: 'Test Material',
    code: 'MAT-001',
    description: 'A test material',
    unit: 'kg',
    manufacturer: 'TestCorp',
    specifications: {},
    basePrice: 100,
    currency: 'RUB',
    minStockLevel: 10,
    maxStockLevel: 100,
    reorderPoint: 20,
    photos: [],
    documents: [],
    barcode: '123456',
    qrCode: 'QR-001',
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const mockCategory = {
    id: 1,
    accountId: 1,
    name: 'Category A',
    code: 'CAT-A',
    description: 'Test category',
    parentCategory: null,
    childCategories: [],
    materials: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialsService,
        {
          provide: MaterialRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            findByCode: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            count: jest.fn(),
            findAllCategories: jest.fn(),
            findCategoryById: jest.fn(),
            createCategory: jest.fn(),
            updateCategory: jest.fn(),
            deleteCategory: jest.fn(),
            countCategories: jest.fn(),
            addAlternative: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MaterialsService>(MaterialsService);
    repository = module.get(MaterialRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated materials', async () => {
      repository.findAll.mockResolvedValue([mockMaterial]);
      repository.count.mockResolvedValue(1);

      const result = await service.findAll(1, 1, 20);

      expect(result).toEqual({
        materials: expect.any(Array),
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(repository.findAll).toHaveBeenCalledWith(1, { skip: 0, take: 20, categoryId: undefined });
      expect(repository.count).toHaveBeenCalledWith(1, undefined);
    });

    it('should pass categoryId filter', async () => {
      repository.findAll.mockResolvedValue([]);
      repository.count.mockResolvedValue(0);

      await service.findAll(1, 1, 20, 5);

      expect(repository.findAll).toHaveBeenCalledWith(1, { skip: 0, take: 20, categoryId: 5 });
      expect(repository.count).toHaveBeenCalledWith(1, 5);
    });
  });

  describe('findById', () => {
    it('should return a material by id', async () => {
      repository.findById.mockResolvedValue(mockMaterial);

      const result = await service.findById(1, 1);

      expect(result.id).toBe(1);
      expect(repository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when material not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId does not match', async () => {
      repository.findById.mockResolvedValue(mockMaterial);

      await expect(service.findById(1, 999)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('should create a material successfully', async () => {
      const dto = { accountId: 1, name: 'New Material', code: 'MAT-002', unit: 'kg' } as any;
      repository.findByCode.mockResolvedValue(null);
      repository.create.mockResolvedValue({ ...mockMaterial, ...dto });

      const result = await service.create(dto, 1);

      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(dto);
    });

    it('should throw ForbiddenException when accountId does not match', async () => {
      const dto = { accountId: 2, name: 'New Material', code: 'MAT-002' } as any;

      await expect(service.create(dto, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when code already exists', async () => {
      const dto = { accountId: 1, name: 'New Material', code: 'MAT-001' } as any;
      repository.findByCode.mockResolvedValue(mockMaterial);

      await expect(service.create(dto, 1)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update a material successfully', async () => {
      const dto = { name: 'Updated Material' } as any;
      repository.findById.mockResolvedValue(mockMaterial);
      repository.update.mockResolvedValue({ ...mockMaterial, name: 'Updated Material' });

      const result = await service.update(1, dto, 1);

      expect(result.name).toBe('Updated Material');
      expect(repository.update).toHaveBeenCalledWith(1, dto);
    });

    it('should throw NotFoundException when material not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(999, {} as any, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId does not match', async () => {
      repository.findById.mockResolvedValue(mockMaterial);

      await expect(service.update(1, {} as any, 999)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when updating to existing code', async () => {
      const dto = { code: 'EXISTING-CODE' } as any;
      repository.findById.mockResolvedValue(mockMaterial);
      repository.findByCode.mockResolvedValue({ ...mockMaterial, id: 2 });

      await expect(service.update(1, dto, 1)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft delete a material', async () => {
      repository.findById.mockResolvedValue(mockMaterial);
      repository.softDelete.mockResolvedValue(undefined);

      await service.remove(1, 1);

      expect(repository.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when material not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId does not match', async () => {
      repository.findById.mockResolvedValue(mockMaterial);

      await expect(service.remove(1, 999)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAllCategories', () => {
    it('should return paginated categories', async () => {
      repository.findAllCategories.mockResolvedValue([mockCategory]);
      repository.countCategories.mockResolvedValue(1);

      const result = await service.findAllCategories(1, 1, 20);

      expect(result).toEqual({
        categories: [mockCategory],
        total: 1,
        page: 1,
        limit: 20,
      });
    });
  });

  describe('findCategoryById', () => {
    it('should return a category by id', async () => {
      repository.findCategoryById.mockResolvedValue(mockCategory);

      const result = await service.findCategoryById(1, 1);

      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException when category not found', async () => {
      repository.findCategoryById.mockResolvedValue(null);

      await expect(service.findCategoryById(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId does not match', async () => {
      repository.findCategoryById.mockResolvedValue(mockCategory);

      await expect(service.findCategoryById(1, 999)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addAlternative', () => {
    it('should add an alternative material', async () => {
      const dto = { alternativeMaterialId: 2, notes: 'Alternative' };
      repository.findById.mockResolvedValue(mockMaterial);
      repository.addAlternative.mockResolvedValue({ id: 1, materialId: 1, alternativeMaterialId: 2 });

      const result = await service.addAlternative(1, dto, 1);

      expect(result).toBeDefined();
      expect(repository.addAlternative).toHaveBeenCalledWith(1, 2, 'Alternative');
    });

    it('should throw NotFoundException when material not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.addAlternative(999, { alternativeMaterialId: 2 } as any, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
