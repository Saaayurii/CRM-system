import { Test, TestingModule } from '@nestjs/testing';
import { MaterialsController } from '../materials.controller';
import { MaterialsService } from '../materials.service';

describe('MaterialsController', () => {
  let controller: MaterialsController;
  let service: jest.Mocked<MaterialsService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };
  const mockMaterial = {
    id: 1,
    accountId: 1,
    categoryId: 1,
    category: { id: 1, name: 'Cat', code: 'C' },
    name: 'Material',
    code: 'MAT-001',
    description: 'desc',
    unit: 'kg',
    manufacturer: 'Corp',
    specifications: {},
    basePrice: 100,
    currency: 'RUB',
    minStockLevel: 10,
    maxStockLevel: 100,
    reorderPoint: 20,
    photos: [],
    documents: [],
    barcode: '123',
    qrCode: 'QR',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaterialsController],
      providers: [
        {
          provide: MaterialsService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findAllCategories: jest.fn(),
            findCategoryById: jest.fn(),
            createCategory: jest.fn(),
            updateCategory: jest.fn(),
            removeCategory: jest.fn(),
            addAlternative: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MaterialsController>(MaterialsController);
    service = module.get(MaterialsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll with correct params', async () => {
      const expected = {
        materials: [mockMaterial],
        total: 1,
        page: 1,
        limit: 20,
      };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(mockUser, 1, 20);

      expect(result).toEqual(expected);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20, undefined);
    });

    it('should use default page and limit when not provided', async () => {
      service.findAll.mockResolvedValue({
        materials: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await controller.findAll(mockUser);

      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20, undefined);
    });
  });

  describe('findOne', () => {
    it('should call service.findById with correct params', async () => {
      service.findById.mockResolvedValue(mockMaterial);

      const result = await controller.findOne(mockUser, 1);

      expect(result).toEqual(mockMaterial);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should call service.create with dto and accountId', async () => {
      const dto = { accountId: 1, name: 'New', code: 'N-1', unit: 'kg' } as any;
      service.create.mockResolvedValue(mockMaterial);

      const result = await controller.create(mockUser, dto);

      expect(result).toEqual(mockMaterial);
      expect(service.create).toHaveBeenCalledWith(dto, 1);
    });
  });

  describe('update', () => {
    it('should call service.update with id, dto and accountId', async () => {
      const dto = { name: 'Updated' } as any;
      service.update.mockResolvedValue({ ...mockMaterial, name: 'Updated' });

      const result = await controller.update(mockUser, 1, dto);

      expect(result.name).toBe('Updated');
      expect(service.update).toHaveBeenCalledWith(1, dto, 1);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id and accountId', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(mockUser, 1);

      expect(service.remove).toHaveBeenCalledWith(1, 1);
    });
  });
});
