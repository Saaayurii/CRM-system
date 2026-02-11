import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeTestsController } from '../knowledge-tests.controller';
import { KnowledgeTestsService } from '../knowledge-tests.service';

describe('KnowledgeTestsController', () => {
  let controller: KnowledgeTestsController;
  let service: jest.Mocked<KnowledgeTestsService>;

  const mockTest = {
    id: 1,
    accountId: 1,
    title: 'Test Quiz',
    description: 'A quiz about training',
    questions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockTest],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeTestsController],
      providers: [
        {
          provide: KnowledgeTestsService,
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

    controller = module.get<KnowledgeTestsController>(KnowledgeTestsController);
    service = module.get(KnowledgeTestsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated knowledge tests', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await controller.findAll(1, 1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findOne', () => {
    it('should return a knowledge test by id', async () => {
      service.findById.mockResolvedValue(mockTest);
      const result = await controller.findOne(1, 1);
      expect(result).toEqual(mockTest);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should create a knowledge test', async () => {
      const dto = { title: 'New Test', description: 'Desc', questions: [] };
      service.create.mockResolvedValue({ ...mockTest, ...dto });
      const result = await controller.create(dto as any, 1);
      expect(result).toBeDefined();
      expect(service.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('update', () => {
    it('should update a knowledge test', async () => {
      const dto = { title: 'Updated' };
      service.update.mockResolvedValue({ ...mockTest, ...dto });
      const result = await controller.update(1, dto as any, 1);
      expect(result.title).toBe('Updated');
      expect(service.update).toHaveBeenCalledWith(1, 1, dto);
    });
  });

  describe('remove', () => {
    it('should delete a knowledge test', async () => {
      service.delete.mockResolvedValue({ count: 1 } as any);
      await controller.remove(1, 1);
      expect(service.delete).toHaveBeenCalledWith(1, 1);
    });
  });
});
