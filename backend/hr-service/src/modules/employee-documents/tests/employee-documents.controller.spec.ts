import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeDocumentsController } from '../employee-documents.controller';
import { EmployeeDocumentsService } from '../employee-documents.service';

describe('EmployeeDocumentsController', () => {
  let controller: EmployeeDocumentsController;
  let service: jest.Mocked<EmployeeDocumentsService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };

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
      controllers: [EmployeeDocumentsController],
      providers: [
        {
          provide: EmployeeDocumentsService,
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

    controller = module.get<EmployeeDocumentsController>(EmployeeDocumentsController);
    service = module.get(EmployeeDocumentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should delegate to service.findAll with user.id', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await controller.findAll(mockUser);
      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findById', () => {
    it('should delegate to service.findById', async () => {
      service.findById.mockResolvedValue(mockDocument);
      const result = await controller.findById(1, mockUser);
      expect(result).toEqual(mockDocument);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should delegate to service.create with user.id', async () => {
      const dto = { title: 'Employment Contract', type: 'contract' } as any;
      service.create.mockResolvedValue(mockDocument);
      const result = await controller.create(dto, mockUser);
      expect(result).toEqual(mockDocument);
      expect(service.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('update', () => {
    it('should delegate to service.update', async () => {
      const dto = { title: 'Updated Contract' } as any;
      service.update.mockResolvedValue({ ...mockDocument, title: 'Updated Contract' });
      await controller.update(1, dto, mockUser);
      expect(service.update).toHaveBeenCalledWith(1, 1, dto);
    });
  });

  describe('delete', () => {
    it('should delegate to service.delete', async () => {
      service.delete.mockResolvedValue(mockDocument);
      await controller.delete(1, mockUser);
      expect(service.delete).toHaveBeenCalledWith(1, 1);
    });
  });
});
