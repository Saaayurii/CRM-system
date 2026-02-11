import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DefectsService } from '../defects.service';
import { DefectRepository } from '../repositories/defect.repository';

describe('DefectsService', () => {
  let service: DefectsService;
  let repository: jest.Mocked<DefectRepository>;

  const now = new Date();
  const mockDefect = {
    id: 1,
    accountId: 1,
    projectId: 1,
    inspectionId: 1,
    title: 'Test Defect',
    description: 'Crack in wall',
    severity: 2,
    status: 0,
    reportedDate: now,
    inspection: { id: 1 },
    createdAt: now,
    updatedAt: now,
  };

  const mockTemplate = {
    id: 1,
    accountId: 1,
    name: 'Defect Template 1',
    createdAt: now,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DefectsService,
        {
          provide: DefectRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findAllTemplates: jest.fn(),
            findTemplateById: jest.fn(),
            createTemplate: jest.fn(),
            updateTemplate: jest.fn(),
            deleteTemplate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DefectsService>(DefectsService);
    repository = module.get(DefectRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated defects', async () => {
      const expected = { data: [mockDefect], total: 1, page: 1, limit: 20, totalPages: 1 };
      repository.findAll.mockResolvedValue(expected);

      const result = await service.findAll(1, 1, 20);

      expect(result).toEqual(expected);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, undefined, undefined);
    });

    it('should pass status and projectId filters', async () => {
      repository.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });

      await service.findAll(1, 1, 20, 1, 3);

      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, 1, 3);
    });
  });

  describe('findById', () => {
    it('should return a defect by id', async () => {
      repository.findById.mockResolvedValue(mockDefect);

      const result = await service.findById(1, 1);

      expect(result).toEqual(mockDefect);
      expect(repository.findById).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a defect', async () => {
      const dto = { title: 'New Defect', reportedDate: now.toISOString() } as any;
      repository.create.mockResolvedValue({ ...mockDefect, title: 'New Defect' });

      const result = await service.create(1, dto);

      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 1,
          title: 'New Defect',
          reportedDate: expect.any(Date),
        }),
      );
    });

    it('should convert optional date strings to Date objects', async () => {
      const dateStr = '2025-06-01T00:00:00Z';
      const dto = {
        title: 'Defect',
        reportedDate: dateStr,
        dueDate: dateStr,
        fixedDate: dateStr,
        verifiedDate: dateStr,
      } as any;
      repository.create.mockResolvedValue(mockDefect);

      await service.create(1, dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          dueDate: new Date(dateStr),
          fixedDate: new Date(dateStr),
          verifiedDate: new Date(dateStr),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update a defect', async () => {
      const dto = { title: 'Updated' } as any;
      repository.findById.mockResolvedValue(mockDefect);
      repository.update.mockResolvedValue({ count: 1 });

      const result = await service.update(1, 1, dto);

      expect(repository.update).toHaveBeenCalledWith(1, 1, expect.objectContaining({ title: 'Updated' }));
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(999, 1, {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a defect', async () => {
      repository.findById.mockResolvedValue(mockDefect);
      repository.delete.mockResolvedValue({ count: 1 });

      const result = await service.delete(1, 1);

      expect(result).toEqual({ message: 'Defect with ID 1 deleted successfully' });
      expect(repository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllTemplates', () => {
    it('should return paginated templates', async () => {
      const expected = { data: [mockTemplate], total: 1, page: 1, limit: 20, totalPages: 1 };
      repository.findAllTemplates.mockResolvedValue(expected);

      const result = await service.findAllTemplates(1, 1, 20);

      expect(result).toEqual(expected);
    });
  });

  describe('findTemplateById', () => {
    it('should return a template by id', async () => {
      repository.findTemplateById.mockResolvedValue(mockTemplate);

      const result = await service.findTemplateById(1, 1);

      expect(result).toEqual(mockTemplate);
    });

    it('should throw NotFoundException when template not found', async () => {
      repository.findTemplateById.mockResolvedValue(null);

      await expect(service.findTemplateById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createTemplate', () => {
    it('should create a defect template', async () => {
      const dto = { name: 'New Template' } as any;
      repository.createTemplate.mockResolvedValue({ ...mockTemplate, name: 'New Template' });

      const result = await service.createTemplate(1, dto);

      expect(result).toBeDefined();
      expect(repository.createTemplate).toHaveBeenCalledWith(expect.objectContaining({ accountId: 1, name: 'New Template' }));
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a template', async () => {
      repository.findTemplateById.mockResolvedValue(mockTemplate);
      repository.deleteTemplate.mockResolvedValue({ count: 1 });

      const result = await service.deleteTemplate(1, 1);

      expect(result).toEqual({ message: 'Defect template with ID 1 deleted successfully' });
    });

    it('should throw NotFoundException when template not found', async () => {
      repository.findTemplateById.mockResolvedValue(null);

      await expect(service.deleteTemplate(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
