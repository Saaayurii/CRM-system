import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GeneratedReportsService } from '../generated-reports.service';
import { GeneratedReportRepository } from '../repositories/generated-report.repository';

describe('GeneratedReportsService', () => {
  let service: GeneratedReportsService;
  let repository: jest.Mocked<GeneratedReportRepository>;

  const mockReport = {
    id: 1,
    accountId: 1,
    name: 'January Report',
    reportTemplateId: 1,
    projectId: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockReport],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeneratedReportsService,
        {
          provide: GeneratedReportRepository,
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

    service = module.get<GeneratedReportsService>(GeneratedReportsService);
    repository = module.get(GeneratedReportRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated generated reports', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await service.findAll(1, 1, 20);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, undefined);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should pass filters to repository', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      const filters = { projectId: 10, reportTemplateId: 1 };
      await service.findAll(1, 1, 20, filters);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, filters);
    });
  });

  describe('findById', () => {
    it('should return report when found', async () => {
      repository.findById.mockResolvedValue(mockReport);
      const result = await service.findById(1, 1);
      expect(repository.findById).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(mockReport);
    });

    it('should throw NotFoundException when report not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should include correct error message in NotFoundException', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(42, 1)).rejects.toThrow('Generated report with ID 42 not found');
    });
  });

  describe('create', () => {
    it('should create a generated report', async () => {
      const dto = { name: 'February Report', reportTemplateId: 1 } as any;
      repository.create.mockResolvedValue(mockReport);
      const result = await service.create(1, dto);
      expect(repository.create).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(mockReport);
    });
  });

  describe('update', () => {
    it('should update report after verifying existence', async () => {
      repository.findById.mockResolvedValue(mockReport);
      const updatedReport = { ...mockReport, name: 'Updated Report' };
      repository.update.mockResolvedValue(updatedReport);
      const dto = { name: 'Updated Report' } as any;
      const result = await service.update(1, 1, dto);
      expect(repository.update).toHaveBeenCalledWith(1, 1, dto);
      expect(result).toEqual(updatedReport);
    });

    it('should throw NotFoundException when updating non-existent report', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update(999, 1, {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete report after verifying existence', async () => {
      repository.findById.mockResolvedValue(mockReport);
      repository.delete.mockResolvedValue(undefined);
      await service.delete(1, 1);
      expect(repository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when deleting non-existent report', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
