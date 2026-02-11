import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ActsService } from '../acts.service';
import { ActRepository } from '../repositories/act.repository';

describe('ActsService', () => {
  let service: ActsService;
  let repository: jest.Mocked<ActRepository>;

  const mockAct = {
    id: 1,
    accountId: 1,
    title: 'Test Act',
    preparedByUserId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
  };

  const mockPaginatedResult = {
    data: [mockAct],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActsService,
        {
          provide: ActRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createItem: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ActsService>(ActsService);
    repository = module.get(ActRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated acts', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await service.findAll(1, 1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findById', () => {
    it('should return an act when found', async () => {
      repository.findById.mockResolvedValue(mockAct);
      const result = await service.findById(1, 1);
      expect(result).toEqual(mockAct);
      expect(repository.findById).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when act not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a new act', async () => {
      const dto = { title: 'Test Act' } as any;
      repository.create.mockResolvedValue(mockAct);
      const result = await service.create(1, dto, 1);
      expect(result).toEqual(mockAct);
      expect(repository.create).toHaveBeenCalledWith(1, dto, 1);
    });
  });

  describe('update', () => {
    it('should update and return the act', async () => {
      const dto = { title: 'Updated Act' } as any;
      const updatedAct = { ...mockAct, title: 'Updated Act' };
      repository.findById.mockResolvedValue(mockAct);
      repository.update.mockResolvedValue(updatedAct);
      const result = await service.update(1, 1, dto);
      expect(result).toEqual(updatedAct);
      expect(repository.update).toHaveBeenCalledWith(1, 1, dto);
    });

    it('should throw NotFoundException when updating non-existent act', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update(999, 1, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete the act', async () => {
      repository.findById.mockResolvedValue(mockAct);
      repository.delete.mockResolvedValue({ count: 1 } as any);
      await service.delete(1, 1);
      expect(repository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when deleting non-existent act', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createItem', () => {
    it('should create an item for an existing act', async () => {
      const dto = {
        description: 'Service item',
        quantity: 2,
        price: 100,
      } as any;
      const mockItem = { id: 1, actId: 1, ...dto };
      repository.findById.mockResolvedValue(mockAct);
      repository.createItem.mockResolvedValue(mockItem);
      const result = await service.createItem(1, 1, dto);
      expect(result).toEqual(mockItem);
      expect(repository.createItem).toHaveBeenCalledWith(1, dto);
    });

    it('should throw NotFoundException when adding item to non-existent act', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.createItem(999, 1, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
