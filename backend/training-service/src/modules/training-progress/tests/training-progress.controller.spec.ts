import { Test, TestingModule } from '@nestjs/testing';
import { TrainingProgressController } from '../training-progress.controller';
import { TrainingProgressService } from '../training-progress.service';

describe('TrainingProgressController', () => {
  let controller: TrainingProgressController;
  let service: jest.Mocked<TrainingProgressService>;

  const mockProgress = {
    id: 1,
    userId: 1,
    trainingMaterialId: 1,
    status: 'in_progress',
    progressPercent: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockProgress],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrainingProgressController],
      providers: [
        {
          provide: TrainingProgressService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TrainingProgressController>(TrainingProgressController);
    service = module.get(TrainingProgressService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated training progress', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await controller.findAll(1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 20, undefined, undefined);
    });
  });

  describe('findOne', () => {
    it('should return a training progress by id', async () => {
      service.findById.mockResolvedValue(mockProgress);
      const result = await controller.findOne(1);
      expect(result).toEqual(mockProgress);
      expect(service.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should create a training progress record', async () => {
      const dto = { userId: 1, trainingMaterialId: 1, status: 'in_progress' };
      service.create.mockResolvedValue({ ...mockProgress, ...dto });
      const result = await controller.create(dto as any);
      expect(result).toBeDefined();
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should update a training progress record', async () => {
      const dto = { progressPercent: 100 };
      service.update.mockResolvedValue({ ...mockProgress, ...dto });
      const result = await controller.update(1, dto as any);
      expect(result.progressPercent).toBe(100);
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });
  });
});
