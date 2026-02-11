import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WikiPagesService } from '../wiki-pages.service';
import { WikiPageRepository } from '../repositories/wiki-page.repository';

describe('WikiPagesService', () => {
  let service: WikiPagesService;
  let repository: jest.Mocked<WikiPageRepository>;

  const mockWikiPage = {
    id: 1,
    accountId: 1,
    title: 'Test Page',
    content: 'Test content',
    category: 'general',
    createdByUserId: 10,
    updatedByUserId: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockWikiPage],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WikiPagesService,
        {
          provide: WikiPageRepository,
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

    service = module.get<WikiPagesService>(WikiPagesService);
    repository = module.get(WikiPageRepository);
  });

  describe('findAll', () => {
    it('should return paginated wiki pages', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await service.findAll(1, 1, 20);

      expect(result).toEqual(mockPaginatedResult);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, undefined);
    });

    it('should pass category filter', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);

      await service.findAll(1, 1, 20, 'general');

      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, 'general');
    });
  });

  describe('findById', () => {
    it('should return a wiki page by id and accountId', async () => {
      repository.findById.mockResolvedValue(mockWikiPage);

      const result = await service.findById(1, 1);

      expect(result).toEqual(mockWikiPage);
      expect(repository.findById).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when page not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new wiki page', async () => {
      const createDto = { title: 'Test Page', content: 'Test content', category: 'general' };
      repository.create.mockResolvedValue(mockWikiPage);

      const result = await service.create(1, 10, createDto as any);

      expect(result).toEqual(mockWikiPage);
      expect(repository.create).toHaveBeenCalledWith(1, 10, createDto);
    });
  });

  describe('update', () => {
    const updateDto = { title: 'Updated Page' };

    it('should update a wiki page', async () => {
      const updated = { ...mockWikiPage, title: 'Updated Page' };
      repository.findById.mockResolvedValue(mockWikiPage);
      repository.update.mockResolvedValue(updated);

      const result = await service.update(1, 1, 10, updateDto as any);

      expect(result).toEqual(updated);
      expect(repository.update).toHaveBeenCalledWith(1, 1, 10, updateDto);
    });

    it('should throw NotFoundException when updating non-existent page', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(999, 1, 10, updateDto as any)).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a wiki page', async () => {
      repository.findById.mockResolvedValue(mockWikiPage);
      repository.delete.mockResolvedValue({ count: 1 });

      const result = await service.delete(1, 1);

      expect(result).toEqual({ count: 1 });
      expect(repository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when deleting non-existent page', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
