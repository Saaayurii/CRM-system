import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SafetyService } from '../safety.service';
import { SafetyRepository } from '../repositories/safety.repository';

describe('SafetyService', () => {
  let service: SafetyService;
  let repository: jest.Mocked<SafetyRepository>;

  const mockIncident = {
    id: 1,
    accountId: 1,
    title: 'Slip and fall',
    description: 'Employee slipped in the hallway',
    severity: 'medium',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTraining = {
    id: 1,
    accountId: 1,
    title: 'Fire Safety Training',
    description: 'Annual fire safety course',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedIncidents = {
    data: [mockIncident],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  const mockPaginatedTrainings = {
    data: [mockTraining],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SafetyService,
        {
          provide: SafetyRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findAllTrainings: jest.fn(),
            findTrainingById: jest.fn(),
            createTraining: jest.fn(),
            updateTraining: jest.fn(),
            deleteTraining: jest.fn(),
            createRecord: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SafetyService>(SafetyService);
    repository = module.get(SafetyRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── Safety Incidents ──────────────────────────────────────────────

  describe('findAllIncidents', () => {
    it('should return paginated incidents', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedIncidents);
      const result = await service.findAllIncidents(1, 1, 20);
      expect(result).toEqual(mockPaginatedIncidents);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20);
    });

    it('should throw BadRequestException when accountId is falsy', async () => {
      await expect(service.findAllIncidents(0, 1, 20)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findIncidentById', () => {
    it('should return an incident when found', async () => {
      repository.findById.mockResolvedValue(mockIncident);
      const result = await service.findIncidentById(1, 1);
      expect(result).toEqual(mockIncident);
    });

    it('should throw NotFoundException when incident not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findIncidentById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createIncident', () => {
    it('should create and return a new incident', async () => {
      const dto = { title: 'Slip and fall' } as any;
      repository.create.mockResolvedValue(mockIncident);
      const result = await service.createIncident(1, dto);
      expect(result).toEqual(mockIncident);
      expect(repository.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('updateIncident', () => {
    it('should update and return the incident', async () => {
      const dto = { severity: 'high' } as any;
      repository.update.mockResolvedValue({ ...mockIncident, severity: 'high' });
      const result = await service.updateIncident(1, 1, dto);
      expect(result.severity).toBe('high');
    });

    it('should throw NotFoundException when updating non-existent incident', async () => {
      repository.update.mockResolvedValue(null);
      await expect(service.updateIncident(999, 1, {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteIncident', () => {
    it('should delete the incident', async () => {
      repository.delete.mockResolvedValue(mockIncident);
      const result = await service.deleteIncident(1, 1);
      expect(result).toEqual(mockIncident);
    });

    it('should throw NotFoundException when deleting non-existent incident', async () => {
      repository.delete.mockResolvedValue(null);
      await expect(service.deleteIncident(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Safety Trainings ─────────────────────────────────────────────

  describe('findAllTrainings', () => {
    it('should return paginated trainings', async () => {
      repository.findAllTrainings.mockResolvedValue(mockPaginatedTrainings);
      const result = await service.findAllTrainings(1, 1, 20);
      expect(result).toEqual(mockPaginatedTrainings);
    });
  });

  describe('findTrainingById', () => {
    it('should return a training when found', async () => {
      repository.findTrainingById.mockResolvedValue(mockTraining);
      const result = await service.findTrainingById(1, 1);
      expect(result).toEqual(mockTraining);
    });

    it('should throw NotFoundException when training not found', async () => {
      repository.findTrainingById.mockResolvedValue(null);
      await expect(service.findTrainingById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createTrainingRecord', () => {
    it('should create and return a training record', async () => {
      const dto = { trainingId: 1, userId: 10, completedAt: new Date() } as any;
      const mockRecord = { id: 1, ...dto };
      repository.createRecord.mockResolvedValue(mockRecord);
      const result = await service.createTrainingRecord(dto);
      expect(result).toEqual(mockRecord);
      expect(repository.createRecord).toHaveBeenCalledWith(dto);
    });
  });
});
