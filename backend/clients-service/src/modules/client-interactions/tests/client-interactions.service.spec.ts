import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClientInteractionsService } from '../client-interactions.service';
import { ClientInteractionRepository } from '../repositories/client-interaction.repository';

describe('ClientInteractionsService', () => {
  let service: ClientInteractionsService;
  let repository: jest.Mocked<ClientInteractionRepository>;

  const mockInteraction = {
    id: 1,
    clientId: 1,
    type: 'call',
    description: 'Follow-up call',
    interactionDate: new Date(),
    nextActionDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginated = {
    data: [mockInteraction],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientInteractionsService,
        {
          provide: ClientInteractionRepository,
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

    service = module.get<ClientInteractionsService>(ClientInteractionsService);
    repository = module.get(ClientInteractionRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated interactions', async () => {
      repository.findAll.mockResolvedValue(mockPaginated);

      const result = await service.findAll(1, 20);

      expect(result).toEqual(mockPaginated);
      expect(repository.findAll).toHaveBeenCalledWith(1, 20, undefined);
    });

    it('should pass clientId filter when provided', async () => {
      repository.findAll.mockResolvedValue(mockPaginated);

      await service.findAll(1, 20, 5);

      expect(repository.findAll).toHaveBeenCalledWith(1, 20, 5);
    });
  });

  describe('findById', () => {
    it('should return an interaction when found', async () => {
      repository.findById.mockResolvedValue(mockInteraction);

      const result = await service.findById(1);

      expect(result).toEqual(mockInteraction);
      expect(repository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when interaction is not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
      await expect(service.findById(999)).rejects.toThrow('Client interaction #999 not found');
    });
  });

  describe('create', () => {
    it('should create and return a new interaction', async () => {
      const dto = { clientId: 1, type: 'email', description: 'Sent proposal', interactionDate: '2024-01-01' } as any;
      repository.create.mockResolvedValue({ ...mockInteraction, ...dto });

      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should update an existing interaction', async () => {
      const dto = { description: 'Updated description' } as any;
      repository.findById.mockResolvedValue(mockInteraction);
      repository.update.mockResolvedValue({ ...mockInteraction, description: 'Updated description' });

      const result = await service.update(1, dto);

      expect(result.description).toBe('Updated description');
      expect(repository.update).toHaveBeenCalledWith(1, dto);
    });

    it('should throw NotFoundException when updating non-existent interaction', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(999, {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete an existing interaction', async () => {
      repository.findById.mockResolvedValue(mockInteraction);
      repository.delete.mockResolvedValue(mockInteraction);

      await service.delete(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when deleting non-existent interaction', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });
});
