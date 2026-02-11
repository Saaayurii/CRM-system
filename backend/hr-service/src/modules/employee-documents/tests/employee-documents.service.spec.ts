import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EmployeeDocumentsService } from '../employee-documents.service';
import { EmployeeDocumentRepository } from '../repositories/employee-document.repository';

describe('EmployeeDocumentsService', () => {
  let service: EmployeeDocumentsService;
  let repository: jest.Mocked<EmployeeDocumentRepository>;

  const mockDocument = {
    id: 1,
    userId: 1,
    title: 'Employment Contract',
    type: 'contract',
    fileUrl: 'https://example.com/doc.pdf',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockDocument],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeDocumentsService,
        {
          provide: EmployeeDocumentRepository,
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

    service = module.get<EmployeeDocumentsService>(EmployeeDocumentsService);
    repository = module.get(EmployeeDocumentRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated employee documents', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await service.findAll(1, 1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findById', () => {
    it('should return a document when found', async () => {
      repository.findById.mockResolvedValue(mockDocument);
      const result = await service.findById(1, 1);
      expect(result).toEqual(mockDocument);
      expect(repository.findById).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when document not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a new employee document', async () => {
      const dto = { title: 'Employment Contract', type: 'contract' } as any;
      repository.create.mockResolvedValue(mockDocument);
      const result = await service.create(1, dto);
      expect(result).toEqual(mockDocument);
      expect(repository.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('update', () => {
    it('should update and return the document', async () => {
      const dto = { title: 'Updated Contract' } as any;
      const updated = { ...mockDocument, title: 'Updated Contract' };
      repository.update.mockResolvedValue(updated);
      const result = await service.update(1, 1, dto);
      expect(result).toEqual(updated);
      expect(repository.update).toHaveBeenCalledWith(1, 1, dto);
    });

    it('should throw NotFoundException when updating non-existent document', async () => {
      repository.update.mockResolvedValue(null);
      await expect(service.update(999, 1, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete the document', async () => {
      repository.delete.mockResolvedValue(mockDocument);
      const result = await service.delete(1, 1);
      expect(result).toEqual(mockDocument);
      expect(repository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when deleting non-existent document', async () => {
      repository.delete.mockResolvedValue(null);
      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
