import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EquipmentService } from '../equipment.service';
import { EquipmentRepository } from '../repositories/equipment.repository';

describe('EquipmentService', () => {
  let service: EquipmentService;
  let repository: jest.Mocked<EquipmentRepository>;

  const mockEquipment = {
    id: 1,
    accountId: 1,
    name: 'Excavator',
    status: 1,
    constructionSiteId: 10,
    purchaseDate: new Date('2024-01-01'),
    lastMaintenanceDate: new Date('2024-06-01'),
    nextMaintenanceDate: new Date('2024-12-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockEquipment],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentService,
        {
          provide: EquipmentRepository,
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

    service = module.get<EquipmentService>(EquipmentService);
    repository = module.get(EquipmentRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated equipment list', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await service.findAll(1, 1, 20);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, undefined, undefined);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should pass status and siteId filters', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      await service.findAll(1, 1, 20, 1, 10);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, 1, 10);
    });
  });

  describe('findById', () => {
    it('should return equipment when found', async () => {
      repository.findById.mockResolvedValue(mockEquipment);
      const result = await service.findById(1, 1);
      expect(repository.findById).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(mockEquipment);
    });

    it('should throw NotFoundException when equipment not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create equipment with date conversions', async () => {
      const dto = {
        name: 'Crane',
        purchaseDate: '2024-01-01',
        lastMaintenanceDate: '2024-06-01',
        nextMaintenanceDate: '2024-12-01',
      } as any;
      repository.create.mockResolvedValue(mockEquipment);
      const result = await service.create(1, dto);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Crane',
          accountId: 1,
          purchaseDate: expect.any(Date),
          lastMaintenanceDate: expect.any(Date),
          nextMaintenanceDate: expect.any(Date),
        }),
      );
      expect(result).toEqual(mockEquipment);
    });
  });

  describe('update', () => {
    it('should update equipment after verifying existence', async () => {
      repository.findById.mockResolvedValue(mockEquipment);
      repository.update.mockResolvedValue(undefined);
      const dto = { name: 'Updated Excavator' } as any;
      const result = await service.update(1, 1, dto);
      expect(repository.update).toHaveBeenCalledWith(1, 1, expect.objectContaining({ name: 'Updated Excavator' }));
      expect(result).toEqual(mockEquipment);
    });

    it('should throw NotFoundException when updating non-existent equipment', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update(999, 1, {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete equipment and return success message', async () => {
      repository.findById.mockResolvedValue(mockEquipment);
      repository.delete.mockResolvedValue(undefined);
      const result = await service.delete(1, 1);
      expect(repository.delete).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual({ message: 'Equipment with ID 1 deleted successfully' });
    });

    it('should throw NotFoundException when deleting non-existent equipment', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
