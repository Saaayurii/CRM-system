import { Test, TestingModule } from '@nestjs/testing';
import { SafetyController } from '../safety.controller';
import { SafetyService } from '../safety.service';

describe('SafetyController', () => {
  let controller: SafetyController;
  let service: jest.Mocked<SafetyService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };

  const mockIncident = {
    id: 1,
    accountId: 1,
    title: 'Slip and fall',
    description: 'Employee slipped',
    severity: 'medium',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTraining = {
    id: 1,
    accountId: 1,
    title: 'Fire Safety Training',
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
      controllers: [SafetyController],
      providers: [
        {
          provide: SafetyService,
          useValue: {
            findAllIncidents: jest.fn(),
            findIncidentById: jest.fn(),
            createIncident: jest.fn(),
            updateIncident: jest.fn(),
            deleteIncident: jest.fn(),
            findAllTrainings: jest.fn(),
            findTrainingById: jest.fn(),
            createTraining: jest.fn(),
            updateTraining: jest.fn(),
            deleteTraining: jest.fn(),
            createTrainingRecord: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SafetyController>(SafetyController);
    service = module.get(SafetyService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── Incidents ─────────────────────────────────────────────────────

  describe('findAllIncidents', () => {
    it('should delegate to service.findAllIncidents', async () => {
      service.findAllIncidents.mockResolvedValue(mockPaginatedIncidents);
      const result = await controller.findAllIncidents(mockUser);
      expect(result).toEqual(mockPaginatedIncidents);
      expect(service.findAllIncidents).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findIncidentById', () => {
    it('should delegate to service.findIncidentById', async () => {
      service.findIncidentById.mockResolvedValue(mockIncident);
      const result = await controller.findIncidentById(1, mockUser);
      expect(result).toEqual(mockIncident);
    });
  });

  describe('createIncident', () => {
    it('should delegate to service.createIncident', async () => {
      const dto = { title: 'Slip and fall' } as any;
      service.createIncident.mockResolvedValue(mockIncident);
      const result = await controller.createIncident(dto, mockUser);
      expect(result).toEqual(mockIncident);
      expect(service.createIncident).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('deleteIncident', () => {
    it('should delegate to service.deleteIncident', async () => {
      service.deleteIncident.mockResolvedValue(mockIncident);
      await controller.deleteIncident(1, mockUser);
      expect(service.deleteIncident).toHaveBeenCalledWith(1, 1);
    });
  });

  // ─── Trainings ────────────────────────────────────────────────────

  describe('findAllTrainings', () => {
    it('should delegate to service.findAllTrainings', async () => {
      service.findAllTrainings.mockResolvedValue(mockPaginatedTrainings);
      const result = await controller.findAllTrainings(mockUser);
      expect(result).toEqual(mockPaginatedTrainings);
      expect(service.findAllTrainings).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('createTraining', () => {
    it('should delegate to service.createTraining', async () => {
      const dto = { title: 'Fire Safety Training' } as any;
      service.createTraining.mockResolvedValue(mockTraining);
      const result = await controller.createTraining(dto, mockUser);
      expect(result).toEqual(mockTraining);
      expect(service.createTraining).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('createTrainingRecord', () => {
    it('should delegate to service.createTrainingRecord', async () => {
      const dto = { trainingId: 1, userId: 10 } as any;
      const mockRecord = { id: 1, ...dto };
      service.createTrainingRecord.mockResolvedValue(mockRecord);
      const result = await controller.createTrainingRecord(dto);
      expect(result).toEqual(mockRecord);
      expect(service.createTrainingRecord).toHaveBeenCalledWith(dto);
    });
  });
});
