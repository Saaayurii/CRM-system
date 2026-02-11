import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DocumentsService } from '../documents.service';
import { DocumentRepository } from '../repositories/document.repository';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let repository: jest.Mocked<DocumentRepository>;

  const mockDocument = {
    id: 1,
    accountId: 1,
    name: 'Test Document',
    documentType: 'contract',
    status: 'active',
    projectId: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
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
        DocumentsService,
        {
          provide: DocumentRepository,
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

    service = module.get<DocumentsService>(DocumentsService);
    repository = module.get(DocumentRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated documents', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await service.findAll(1, 1, 20);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, undefined);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should pass filters to repository', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      const filters = {
        projectId: 10,
        documentType: 'contract',
        status: 'active',
      };
      await service.findAll(1, 1, 20, filters);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, filters);
    });
  });

  describe('findById', () => {
    it('should return document when found', async () => {
      repository.findById.mockResolvedValue(mockDocument);
      const result = await service.findById(1, 1);
      expect(repository.findById).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(mockDocument);
    });

    it('should throw NotFoundException when document not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a document', async () => {
      const dto = { name: 'New Document', documentType: 'permit' } as any;
      repository.create.mockResolvedValue(mockDocument);
      const result = await service.create(1, dto);
      expect(repository.create).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(mockDocument);
    });
  });

  describe('update', () => {
    it('should update document after verifying existence', async () => {
      repository.findById.mockResolvedValue(mockDocument);
      const updatedDoc = { ...mockDocument, name: 'Updated Document' };
      repository.update.mockResolvedValue(updatedDoc);
      const dto = { name: 'Updated Document' } as any;
      const result = await service.update(1, 1, dto);
      expect(repository.update).toHaveBeenCalledWith(1, 1, dto);
      expect(result).toEqual(updatedDoc);
    });

    it('should throw NotFoundException when updating non-existent document', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update(999, 1, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete document after verifying existence', async () => {
      repository.findById.mockResolvedValue(mockDocument);
      repository.delete.mockResolvedValue(undefined);
      const result = await service.delete(1, 1);
      expect(repository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when deleting non-existent document', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
