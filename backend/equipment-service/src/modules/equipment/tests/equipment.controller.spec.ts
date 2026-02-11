import { Test, TestingModule } from '@nestjs/testing';
import { EquipmentController } from '../equipment.controller';
import { EquipmentService } from '../equipment.service';

describe('EquipmentController', () => {
  let controller: EquipmentController;
  let service: jest.Mocked<EquipmentService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };

  const mockEquipment = {
    id: 1,
    accountId: 1,
    name: 'Excavator',
    status: 1,
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
      controllers: [EquipmentController],
      providers: [
        {
          provide: EquipmentService,
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

    controller = module.get<EquipmentController>(EquipmentController);
    service = module.get(EquipmentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated equipment with default params', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await controller.findAll(mockUser);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20, undefined, undefined);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should pass parsed query params to service', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      await controller.findAll(mockUser, '2', '10', '1', '5');
      expect(service.findAll).toHaveBeenCalledWith(1, 2, 10, 1, 5);
    });
  });

  describe('findById', () => {
    it('should return equipment by id', async () => {
      service.findById.mockResolvedValue(mockEquipment);
      const result = await controller.findById(mockUser, 1);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(mockEquipment);
    });
  });

  describe('create', () => {
    it('should create equipment', async () => {
      const dto = { name: 'Crane' } as any;
      service.create.mockResolvedValue(mockEquipment);
      const result = await controller.create(mockUser, dto);
      expect(service.create).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(mockEquipment);
    });
  });

  describe('update', () => {
    it('should update equipment', async () => {
      const dto = { name: 'Updated' } as any;
      service.update.mockResolvedValue(mockEquipment);
      const result = await controller.update(mockUser, 1, dto);
      expect(service.update).toHaveBeenCalledWith(1, 1, dto);
      expect(result).toEqual(mockEquipment);
    });
  });

  describe('delete', () => {
    it('should delete equipment', async () => {
      const deleteResult = { message: 'Equipment with ID 1 deleted successfully' };
      service.delete.mockResolvedValue(deleteResult);
      const result = await controller.delete(mockUser, 1);
      expect(service.delete).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(deleteResult);
    });
  });
});
