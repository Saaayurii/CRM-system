import { Test, TestingModule } from '@nestjs/testing';
import { TrainingMaterialsController } from '../training-materials.controller';
import { TrainingMaterialsService } from '../training-materials.service';

describe('TrainingMaterialsController', () => {
  let controller: TrainingMaterialsController;
  let service: jest.Mocked<TrainingMaterialsService>;

  const mockMaterial = {
    id: 1,
    accountId: 1,
    title: 'Test Material',
    category: 'onboarding',
    content: 'Some content',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockMaterial],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrainingMaterialsController],
      providers: [
        {
          provide: TrainingMaterialsService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TrainingMaterialsController>(
      TrainingMaterialsController,
    );
    service = module.get(TrainingMaterialsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated training materials', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await controller.findAll(1, 1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20, undefined);
    });
  });

  describe('findOne', () => {
    it('should return a training material by id', async () => {
      service.findById.mockResolvedValue(mockMaterial);
      const result = await controller.findOne(1, 1);
      expect(result).toEqual(mockMaterial);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should create a training material', async () => {
      const dto = {
        title: 'New Material',
        content: 'Content',
        category: 'onboarding',
      };
      service.create.mockResolvedValue({ ...mockMaterial, ...dto });
      const result = await controller.create(dto as any, 1);
      expect(result).toBeDefined();
      expect(service.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('update', () => {
    it('should update a training material', async () => {
      const dto = { title: 'Updated' };
      service.update.mockResolvedValue({ ...mockMaterial, ...dto });
      const result = await controller.update(1, dto as any, 1);
      expect(result.title).toBe('Updated');
      expect(service.update).toHaveBeenCalledWith(1, 1, dto);
    });
  });

  describe('remove', () => {
    it('should delete a training material', async () => {
      service.delete.mockResolvedValue({ count: 1 } as any);
      await controller.remove(1, 1);
      expect(service.delete).toHaveBeenCalledWith(1, 1);
    });
  });
});
