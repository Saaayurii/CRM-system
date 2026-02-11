import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AttendanceService } from '../attendance.service';
import { AttendanceRepository } from '../repositories/attendance.repository';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let repository: jest.Mocked<AttendanceRepository>;

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
      providers: [
        AttendanceService,
        {
          provide: AttendanceRepository,
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

    service = module.get<AttendanceService>(AttendanceService);
    repository = module.get(AttendanceRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated attendance records', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await service.findAll(1, 1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findById', () => {
    it('should return an attendance record when found', async () => {
      repository.findById.mockResolvedValue(mockAttendance);
      const result = await service.findById(1, 1);
      expect(result).toEqual(mockAttendance);
      expect(repository.findById).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when attendance record not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a new attendance record', async () => {
      const dto = { date: '2025-01-15', checkIn: '09:00' } as any;
      repository.create.mockResolvedValue(mockAttendance);
      const result = await service.create(1, dto);
      expect(result).toEqual(mockAttendance);
      expect(repository.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('update', () => {
    it('should update and return the attendance record', async () => {
      const dto = { checkOut: '18:00' } as any;
      const updated = { ...mockAttendance, checkOut: '18:00' };
      repository.update.mockResolvedValue(updated);
      const result = await service.update(1, 1, dto);
      expect(result).toEqual(updated);
      expect(repository.update).toHaveBeenCalledWith(1, 1, dto);
    });

    it('should throw NotFoundException when updating non-existent record', async () => {
      repository.update.mockResolvedValue(null);
      await expect(service.update(999, 1, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete the attendance record', async () => {
      repository.delete.mockResolvedValue(mockAttendance);
      const result = await service.delete(1, 1);
      expect(result).toEqual(mockAttendance);
      expect(repository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when deleting non-existent record', async () => {
      repository.delete.mockResolvedValue(null);
      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
