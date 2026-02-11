import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClientsService } from '../clients.service';
import { ClientsRepository } from '../repositories/clients.repository';

describe('ClientsService', () => {
  let service: ClientsService;
  let repository: jest.Mocked<ClientsRepository>;

  const mockClient = {
    id: 1,
    accountId: 1,
    name: 'Test Client',
    email: 'client@test.com',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginated = {
    data: [mockClient],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        {
          provide: ClientsRepository,
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

    service = module.get<ClientsService>(ClientsService);
    repository = module.get(ClientsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated clients', async () => {
      repository.findAll.mockResolvedValue(mockPaginated);

      const result = await service.findAll(1, 1, 20);

      expect(result).toEqual(mockPaginated);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, undefined, undefined);
    });

    it('should pass status and managerId filters', async () => {
      repository.findAll.mockResolvedValue(mockPaginated);

      await service.findAll(1, 1, 20, 'active', 5);

      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, 'active', 5);
    });
  });

  describe('findById', () => {
    it('should return a client when found', async () => {
      repository.findById.mockResolvedValue(mockClient);

      const result = await service.findById(1, 1);

      expect(result).toEqual(mockClient);
      expect(repository.findById).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when client is not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findById(999, 1)).rejects.toThrow('Client #999 not found');
    });
  });

  describe('create', () => {
    it('should create and return a new client', async () => {
      const dto = { name: 'New Client', email: 'new@test.com' } as any;
      repository.create.mockResolvedValue({ ...mockClient, ...dto });

      const result = await service.create(1, dto);

      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('update', () => {
    it('should update an existing client', async () => {
      const dto = { name: 'Updated Client' } as any;
      repository.findById.mockResolvedValue(mockClient);
      repository.update.mockResolvedValue({ ...mockClient, name: 'Updated Client' });

      const result = await service.update(1, 1, dto);

      expect(result.name).toBe('Updated Client');
      expect(repository.update).toHaveBeenCalledWith(1, 1, dto);
    });

    it('should throw NotFoundException when updating non-existent client', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(999, 1, {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete an existing client', async () => {
      repository.findById.mockResolvedValue(mockClient);
      repository.delete.mockResolvedValue({ count: 1 });

      await service.delete(1, 1);

      expect(repository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when deleting non-existent client', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
