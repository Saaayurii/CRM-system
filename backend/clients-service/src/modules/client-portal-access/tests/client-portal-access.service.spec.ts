import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClientPortalAccessService } from '../client-portal-access.service';
import { ClientPortalAccessRepository } from '../repositories/client-portal-access.repository';

describe('ClientPortalAccessService', () => {
  let service: ClientPortalAccessService;
  let repository: jest.Mocked<ClientPortalAccessRepository>;

  const mockAccess = {
    id: 1,
    clientId: 1,
    email: 'portal@test.com',
    isActive: true,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginated = {
    data: [mockAccess],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientPortalAccessService,
        {
          provide: ClientPortalAccessRepository,
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

    service = module.get<ClientPortalAccessService>(ClientPortalAccessService);
    repository = module.get(ClientPortalAccessRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated portal access records', async () => {
      repository.findAll.mockResolvedValue(mockPaginated);

      const result = await service.findAll(1, 20);

      expect(result).toEqual(mockPaginated);
      expect(repository.findAll).toHaveBeenCalledWith(1, 20, undefined);
    });

    it('should pass clientId filter when provided', async () => {
      repository.findAll.mockResolvedValue(mockPaginated);

      await service.findAll(1, 20, 3);

      expect(repository.findAll).toHaveBeenCalledWith(1, 20, 3);
    });
  });

  describe('findById', () => {
    it('should return a portal access record when found', async () => {
      repository.findById.mockResolvedValue(mockAccess);

      const result = await service.findById(1);

      expect(result).toEqual(mockAccess);
      expect(repository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when record is not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
      await expect(service.findById(999)).rejects.toThrow('Client portal access #999 not found');
    });
  });

  describe('create', () => {
    it('should create and return a new portal access record', async () => {
      const dto = { clientId: 1, email: 'new@test.com' } as any;
      repository.create.mockResolvedValue({ ...mockAccess, ...dto });

      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should update an existing portal access record', async () => {
      const dto = { isActive: false } as any;
      repository.findById.mockResolvedValue(mockAccess);
      repository.update.mockResolvedValue({ ...mockAccess, isActive: false });

      const result = await service.update(1, dto);

      expect(result.isActive).toBe(false);
      expect(repository.update).toHaveBeenCalledWith(1, dto);
    });

    it('should throw NotFoundException when updating non-existent record', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(999, {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete an existing portal access record', async () => {
      repository.findById.mockResolvedValue(mockAccess);
      repository.delete.mockResolvedValue(mockAccess);

      await service.delete(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when deleting non-existent record', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });
});
