import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from '../documents.controller';
import { DocumentsService } from '../documents.service';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let service: jest.Mocked<DocumentsService>;

  const mockAccountId = 1;

  const mockDocument = {
    id: 1,
    accountId: 1,
    name: 'Test Document',
    documentType: 'contract',
    status: 'active',
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
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
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

    controller = module.get<DocumentsController>(DocumentsController);
    service = module.get(DocumentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated documents with default params', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await controller.findAll(mockAccountId);
      expect(service.findAll).toHaveBeenCalledWith(mockAccountId, 1, 20, {});
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should pass filters to service', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      await controller.findAll(mockAccountId, 2, 10, 5, 'contract', 'active');
      expect(service.findAll).toHaveBeenCalledWith(mockAccountId, 2, 10, {
        projectId: 5,
        documentType: 'contract',
        status: 'active',
      });
    });
  });

  describe('findOne', () => {
    it('should return document by id', async () => {
      service.findById.mockResolvedValue(mockDocument);
      const result = await controller.findOne(1, mockAccountId);
      expect(service.findById).toHaveBeenCalledWith(1, mockAccountId);
      expect(result).toEqual(mockDocument);
    });
  });

  describe('create', () => {
    it('should create a document', async () => {
      const dto = { name: 'New Doc' } as any;
      service.create.mockResolvedValue(mockDocument);
      const result = await controller.create(dto, mockAccountId);
      expect(service.create).toHaveBeenCalledWith(mockAccountId, dto);
      expect(result).toEqual(mockDocument);
    });
  });

  describe('update', () => {
    it('should update a document', async () => {
      const dto = { name: 'Updated' } as any;
      service.update.mockResolvedValue(mockDocument);
      const result = await controller.update(1, dto, mockAccountId);
      expect(service.update).toHaveBeenCalledWith(1, mockAccountId, dto);
      expect(result).toEqual(mockDocument);
    });
  });

  describe('remove', () => {
    it('should delete a document', async () => {
      service.delete.mockResolvedValue(undefined);
      const result = await controller.remove(1, mockAccountId);
      expect(service.delete).toHaveBeenCalledWith(1, mockAccountId);
    });
  });
});
