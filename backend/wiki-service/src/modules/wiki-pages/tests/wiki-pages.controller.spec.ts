import { Test, TestingModule } from '@nestjs/testing';
import { WikiPagesController } from '../wiki-pages.controller';
import { WikiPagesService } from '../wiki-pages.service';

describe('WikiPagesController', () => {
  let controller: WikiPagesController;
  let service: jest.Mocked<WikiPagesService>;

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
      controllers: [WikiPagesController],
      providers: [
        {
          provide: WikiPagesService,
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

    controller = module.get<WikiPagesController>(WikiPagesController);
    service = module.get(WikiPagesService);
  });

  describe('findAll', () => {
    it('should return paginated wiki pages', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll(1, 1, 20);

      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20, undefined);
    });

    it('should pass category filter', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll(1, 1, 20, 'general');

      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20, 'general');
    });
  });

  describe('findOne', () => {
    it('should return a wiki page by id', async () => {
      service.findById.mockResolvedValue(mockWikiPage);

      const result = await controller.findOne(1, 1);

      expect(result).toEqual(mockWikiPage);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should create a new wiki page', async () => {
      const createDto = { title: 'Test Page', content: 'Test content', category: 'general' };
      service.create.mockResolvedValue(mockWikiPage);

      const result = await controller.create(createDto as any, 1, 10);

      expect(result).toEqual(mockWikiPage);
      expect(service.create).toHaveBeenCalledWith(1, 10, createDto);
    });
  });

  describe('update', () => {
    it('should update a wiki page', async () => {
      const updateDto = { title: 'Updated Page' };
      const updated = { ...mockWikiPage, title: 'Updated Page' };
      service.update.mockResolvedValue(updated);

      const result = await controller.update(1, updateDto as any, 1, 10);

      expect(result).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith(1, 1, 10, updateDto);
    });
  });

  describe('remove', () => {
    it('should delete a wiki page', async () => {
      service.delete.mockResolvedValue({ count: 1 } as any);

      const result = await controller.remove(1, 1);

      expect(result).toEqual({ count: 1 });
      expect(service.delete).toHaveBeenCalledWith(1, 1);
    });
  });
});
