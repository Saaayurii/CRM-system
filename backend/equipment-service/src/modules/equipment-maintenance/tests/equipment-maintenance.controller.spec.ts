import { Test, TestingModule } from '@nestjs/testing';
import { EquipmentMaintenanceController } from '../equipment-maintenance.controller';
import { EquipmentMaintenanceService } from '../equipment-maintenance.service';

describe('EquipmentMaintenanceController', () => {
  let controller: EquipmentMaintenanceController;
  let service: jest.Mocked<EquipmentMaintenanceService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };

  const mockRecord = {
    id: 1,
    equipmentId: 1,
    maintenanceDate: new Date('2024-06-01'),
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
      controllers: [EquipmentMaintenanceController],
      providers: [
        {
          provide: EquipmentMaintenanceService,
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

    controller = module.get<EquipmentMaintenanceController>(EquipmentMaintenanceController);
    service = module.get(EquipmentMaintenanceService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated maintenance records with default params', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await controller.findAll(mockUser);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20, undefined);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should pass parsed query params to service', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      await controller.findAll(mockUser, '2', '10', '5');
      expect(service.findAll).toHaveBeenCalledWith(1, 2, 10, 5);
    });
  });

  describe('findById', () => {
    it('should return maintenance record by id', async () => {
      service.findById.mockResolvedValue(mockRecord);
      const result = await controller.findById(mockUser, 1);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(mockRecord);
    });
  });

  describe('create', () => {
    it('should create maintenance record', async () => {
      const dto = { equipmentId: 1, maintenanceDate: '2024-06-01' } as any;
      service.create.mockResolvedValue(mockRecord);
      const result = await controller.create(mockUser, dto);
      expect(service.create).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(mockRecord);
    });
  });

  describe('update', () => {
    it('should update maintenance record', async () => {
      const dto = { description: 'Updated' } as any;
      service.update.mockResolvedValue(mockRecord);
      const result = await controller.update(mockUser, 1, dto);
      expect(service.update).toHaveBeenCalledWith(1, 1, dto);
      expect(result).toEqual(mockRecord);
    });
  });

  describe('delete', () => {
    it('should delete maintenance record', async () => {
      const deleteResult = { message: 'Equipment maintenance record with ID 1 deleted successfully' };
      service.delete.mockResolvedValue(deleteResult);
      const result = await controller.delete(mockUser, 1);
      expect(service.delete).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(deleteResult);
    });
  });
});
