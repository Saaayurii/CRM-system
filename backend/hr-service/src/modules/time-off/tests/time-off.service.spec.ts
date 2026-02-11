import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TimeOffService } from '../time-off.service';
import { TimeOffRepository } from '../repositories/time-off.repository';

describe('TimeOffService', () => {
  let service: TimeOffService;
  let repository: jest.Mocked<TimeOffRepository>;

  const mockTimeOff = {
    id: 1,
    userId: 1,
    type: 'vacation',
    startDate: new Date(),
    endDate: new Date(),
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockTimeOff],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeOffService,
        {
          provide: TimeOffRepository,
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

    service = module.get<TimeOffService>(TimeOffService);
    repository = module.get(TimeOffRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated time-off requests', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await service.findAll(1, 1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findById', () => {
    it('should return a time-off request when found', async () => {
      repository.findById.mockResolvedValue(mockTimeOff);
      const result = await service.findById(1, 1);
      expect(result).toEqual(mockTimeOff);
      expect(repository.findById).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when time-off request not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a new time-off request', async () => {
      const dto = {
        type: 'vacation',
        startDate: '2025-06-01',
        endDate: '2025-06-10',
      } as any;
      repository.create.mockResolvedValue(mockTimeOff);
      const result = await service.create(1, dto);
      expect(result).toEqual(mockTimeOff);
      expect(repository.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('update', () => {
    it('should update and return the time-off request', async () => {
      const dto = { status: 'approved' } as any;
      const updated = { ...mockTimeOff, status: 'approved' };
      repository.update.mockResolvedValue(updated);
      const result = await service.update(1, 1, dto);
      expect(result).toEqual(updated);
      expect(repository.update).toHaveBeenCalledWith(1, 1, dto);
    });

    it('should throw NotFoundException when updating non-existent request', async () => {
      repository.update.mockResolvedValue(null);
      await expect(service.update(999, 1, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete the time-off request', async () => {
      repository.delete.mockResolvedValue(mockTimeOff);
      const result = await service.delete(1, 1);
      expect(result).toEqual(mockTimeOff);
      expect(repository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when deleting non-existent request', async () => {
      repository.delete.mockResolvedValue(null);
      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
