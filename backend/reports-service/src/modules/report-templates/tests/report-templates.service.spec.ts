import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReportTemplatesService } from '../report-templates.service';
import { ReportTemplateRepository } from '../repositories/report-template.repository';

describe('ReportTemplatesService', () => {
  let service: ReportTemplatesService;
  let repository: jest.Mocked<ReportTemplateRepository>;

  const mockTemplate = {
    id: 1,
    accountId: 1,
    name: 'Monthly Report',
    description: 'Monthly project report template',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockTemplate],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportTemplatesService,
        {
          provide: ReportTemplateRepository,
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

    service = module.get<ReportTemplatesService>(ReportTemplatesService);
    repository = module.get(ReportTemplateRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated report templates', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await service.findAll(1, 1, 20);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20);
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('findById', () => {
    it('should return template when found', async () => {
      repository.findById.mockResolvedValue(mockTemplate);
      const result = await service.findById(1, 1);
      expect(repository.findById).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(mockTemplate);
    });

    it('should throw NotFoundException when template not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should include correct error message in NotFoundException', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(42, 1)).rejects.toThrow(
        'Report template with ID 42 not found',
      );
    });
  });

  describe('create', () => {
    it('should create a report template', async () => {
      const dto = {
        name: 'Weekly Report',
        description: 'Weekly summary',
      } as any;
      repository.create.mockResolvedValue(mockTemplate);
      const result = await service.create(1, dto);
      expect(repository.create).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('update', () => {
    it('should update template after verifying existence', async () => {
      repository.findById.mockResolvedValue(mockTemplate);
      const updatedTemplate = { ...mockTemplate, name: 'Updated Report' };
      repository.update.mockResolvedValue(updatedTemplate);
      const dto = { name: 'Updated Report' } as any;
      const result = await service.update(1, 1, dto);
      expect(repository.update).toHaveBeenCalledWith(1, 1, dto);
      expect(result).toEqual(updatedTemplate);
    });

    it('should throw NotFoundException when updating non-existent template', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update(999, 1, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete template after verifying existence', async () => {
      repository.findById.mockResolvedValue(mockTemplate);
      repository.delete.mockResolvedValue(undefined);
      await service.delete(1, 1);
      expect(repository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when deleting non-existent template', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
