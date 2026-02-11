import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { MaterialRequestsService } from '../material-requests.service';
import { MaterialRequestRepository } from '../repositories/material-request.repository';

describe('MaterialRequestsService', () => {
  let service: MaterialRequestsService;
  let repository: jest.Mocked<MaterialRequestRepository>;

  const now = new Date();
  const mockRequest = {
    id: 1,
    accountId: 1,
    requestNumber: 'REQ-001',
    requestedByUserId: 1,
    status: 0,
    requestDate: now,
    items: [],
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialRequestsService,
        {
          provide: MaterialRequestRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            findByRequestNumber: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            addItem: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MaterialRequestsService>(MaterialRequestsService);
    repository = module.get(MaterialRequestRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated material requests', async () => {
      repository.findAll.mockResolvedValue([mockRequest]);
      repository.count.mockResolvedValue(1);

      const result = await service.findAll(1, 1, 20);

      expect(result).toEqual({
        materialRequests: [mockRequest],
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(repository.findAll).toHaveBeenCalledWith(1, {
        skip: 0,
        take: 20,
        status: undefined,
      });
    });

    it('should pass status filter', async () => {
      repository.findAll.mockResolvedValue([]);
      repository.count.mockResolvedValue(0);

      await service.findAll(1, 2, 10, 1);

      expect(repository.findAll).toHaveBeenCalledWith(1, {
        skip: 10,
        take: 10,
        status: 1,
      });
      expect(repository.count).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('findById', () => {
    it('should return a material request by id', async () => {
      repository.findById.mockResolvedValue(mockRequest);

      const result = await service.findById(1, 1);

      expect(result).toEqual(mockRequest);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      repository.findById.mockResolvedValue(mockRequest);

      await expect(service.findById(1, 999)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('create', () => {
    it('should create a material request', async () => {
      const dto = {
        accountId: 1,
        requestNumber: 'REQ-002',
        requestDate: now.toISOString(),
      } as any;
      repository.findByRequestNumber.mockResolvedValue(null);
      repository.create.mockResolvedValue({
        ...mockRequest,
        requestNumber: 'REQ-002',
      });

      const result = await service.create(dto, 1);

      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(dto);
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      const dto = { accountId: 2, requestNumber: 'REQ-002' } as any;

      await expect(service.create(dto, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when request number exists', async () => {
      const dto = { accountId: 1, requestNumber: 'REQ-001' } as any;
      repository.findByRequestNumber.mockResolvedValue(mockRequest);

      await expect(service.create(dto, 1)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update a material request', async () => {
      const dto = { status: 1 } as any;
      repository.findById.mockResolvedValue(mockRequest);
      repository.update.mockResolvedValue({ ...mockRequest, status: 1 });

      const result = await service.update(1, dto, 1);

      expect(result.status).toBe(1);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(999, {} as any, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      repository.findById.mockResolvedValue(mockRequest);

      await expect(service.update(1, {} as any, 999)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a material request', async () => {
      repository.findById.mockResolvedValue(mockRequest);
      repository.delete.mockResolvedValue(undefined);

      await service.remove(1, 1);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('addItem', () => {
    it('should add an item to material request', async () => {
      const dto = { materialId: 1, requestedQuantity: 10, unit: 'kg' } as any;
      repository.findById.mockResolvedValue(mockRequest);
      repository.addItem.mockResolvedValue({
        id: 1,
        materialRequestId: 1,
        materialId: 1,
      });

      const result = await service.addItem(1, dto, 1);

      expect(result).toBeDefined();
      expect(repository.addItem).toHaveBeenCalledWith(1, dto);
    });

    it('should throw NotFoundException when material request not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.addItem(999, {} as any, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when accountId mismatch', async () => {
      repository.findById.mockResolvedValue(mockRequest);

      await expect(service.addItem(1, {} as any, 999)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
