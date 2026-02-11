import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EquipmentMaintenanceService } from '../equipment-maintenance.service';
import { EquipmentMaintenanceRepository } from '../repositories/equipment-maintenance.repository';

describe('EquipmentMaintenanceService', () => {
  let service: EquipmentMaintenanceService;
  let repository: jest.Mocked<EquipmentMaintenanceRepository>;

  const mockRecord = {
    id: 1,
    equipmentId: 1,
    maintenanceDate: new Date('2024-06-01'),
    nextMaintenanceDate: new Date('2024-12-01'),
    description: 'Routine checkup',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockRecord],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentMaintenanceService,
        {
          provide: EquipmentMaintenanceRepository,
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

    service = module.get<EquipmentMaintenanceService>(
      EquipmentMaintenanceService,
    );
    repository = module.get(EquipmentMaintenanceRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated maintenance records', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await service.findAll(1, 1, 20);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, undefined);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should pass equipmentId filter', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      await service.findAll(1, 1, 20, 5);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, 5);
    });
  });

  describe('findById', () => {
    it('should return maintenance record when found', async () => {
      repository.findById.mockResolvedValue(mockRecord);
      const result = await service.findById(1, 1);
      expect(repository.findById).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(mockRecord);
    });

    it('should throw NotFoundException when record not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create maintenance record with date conversions', async () => {
      const dto = {
        equipmentId: 1,
        maintenanceDate: '2024-06-01',
        nextMaintenanceDate: '2024-12-01',
        description: 'Oil change',
      } as any;
      repository.create.mockResolvedValue(mockRecord);
      const result = await service.create(1, dto);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          equipmentId: 1,
          maintenanceDate: expect.any(Date),
          nextMaintenanceDate: expect.any(Date),
        }),
      );
      expect(result).toEqual(mockRecord);
    });
  });

  describe('update', () => {
    it('should update maintenance record after verifying existence', async () => {
      repository.findById.mockResolvedValue(mockRecord);
      repository.update.mockResolvedValue(undefined);
      const dto = { description: 'Updated description' } as any;
      const result = await service.update(1, 1, dto);
      expect(repository.update).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({ description: 'Updated description' }),
      );
      expect(result).toEqual(mockRecord);
    });

    it('should throw NotFoundException when updating non-existent record', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update(999, 1, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete record and return success message', async () => {
      repository.findById.mockResolvedValue(mockRecord);
      repository.delete.mockResolvedValue(undefined);
      const result = await service.delete(1, 1);
      expect(repository.delete).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual({
        message: 'Equipment maintenance record with ID 1 deleted successfully',
      });
    });

    it('should throw NotFoundException when deleting non-existent record', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
