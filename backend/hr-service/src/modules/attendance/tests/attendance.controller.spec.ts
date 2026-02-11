import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceController } from '../attendance.controller';
import { AttendanceService } from '../attendance.service';

describe('AttendanceController', () => {
  let controller: AttendanceController;
  let service: jest.Mocked<AttendanceService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };

  const mockAttendance = {
    id: 1,
    userId: 1,
    date: new Date(),
    checkIn: new Date(),
    checkOut: new Date(),
    status: 'present',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockAttendance],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [
        {
          provide: AttendanceService,
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

    controller = module.get<AttendanceController>(AttendanceController);
    service = module.get(AttendanceService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should delegate to service.findAll with user.id', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await controller.findAll(mockUser);
      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findById', () => {
    it('should delegate to service.findById', async () => {
      service.findById.mockResolvedValue(mockAttendance);
      const result = await controller.findById(1, mockUser);
      expect(result).toEqual(mockAttendance);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should delegate to service.create with user.id', async () => {
      const dto = { date: '2025-01-15', checkIn: '09:00' } as any;
      service.create.mockResolvedValue(mockAttendance);
      const result = await controller.create(dto, mockUser);
      expect(result).toEqual(mockAttendance);
      expect(service.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('update', () => {
    it('should delegate to service.update', async () => {
      const dto = { checkOut: '18:00' } as any;
      service.update.mockResolvedValue({ ...mockAttendance, checkOut: '18:00' } as any);
      await controller.update(1, dto, mockUser);
      expect(service.update).toHaveBeenCalledWith(1, 1, dto);
    });
  });

  describe('delete', () => {
    it('should delegate to service.delete', async () => {
      service.delete.mockResolvedValue(mockAttendance);
      await controller.delete(1, mockUser);
      expect(service.delete).toHaveBeenCalledWith(1, 1);
    });
  });
});
