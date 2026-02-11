import { Test, TestingModule } from '@nestjs/testing';
import { BonusesController } from '../bonuses.controller';
import { BonusesService } from '../bonuses.service';

describe('BonusesController', () => {
  let controller: BonusesController;
  let service: jest.Mocked<BonusesService>;

  const mockBonus = {
    id: 1,
    accountId: 1,
    userId: 10,
    amount: 5000,
    status: 1,
    projectId: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockBonus],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BonusesController],
      providers: [
        {
          provide: BonusesService,
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

    controller = module.get<BonusesController>(BonusesController);
    service = module.get(BonusesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should delegate to service.findAll with filters', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await controller.findAll(1, 1, 20, 10, 2, 1);
      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20, {
        userId: 10,
        projectId: 2,
        status: 1,
      });
    });

    it('should delegate to service.findAll without filters', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await controller.findAll(1, 1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20, {});
    });
  });

  describe('findOne', () => {
    it('should delegate to service.findById', async () => {
      service.findById.mockResolvedValue(mockBonus);
      const result = await controller.findOne(1, 1);
      expect(result).toEqual(mockBonus);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should delegate to service.create', async () => {
      const dto = { userId: 10, amount: 5000 } as any;
      service.create.mockResolvedValue(mockBonus);
      const result = await controller.create(dto, 1);
      expect(result).toEqual(mockBonus);
      expect(service.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('update', () => {
    it('should delegate to service.update', async () => {
      const dto = { amount: 6000 } as any;
      service.update.mockResolvedValue({ ...mockBonus, amount: 6000 });
      const result = await controller.update(1, dto, 1);
      expect(service.update).toHaveBeenCalledWith(1, 1, dto);
    });
  });

  describe('remove', () => {
    it('should delegate to service.delete', async () => {
      service.delete.mockResolvedValue({ count: 1 } as any);
      await controller.remove(1, 1);
      expect(service.delete).toHaveBeenCalledWith(1, 1);
    });
  });
});
