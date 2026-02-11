import { Test, TestingModule } from '@nestjs/testing';
import { TestAttemptsController } from '../test-attempts.controller';
import { TestAttemptsService } from '../test-attempts.service';

describe('TestAttemptsController', () => {
  let controller: TestAttemptsController;
  let service: jest.Mocked<TestAttemptsService>;

  const mockAttempt = {
    id: 1,
    knowledgeTestId: 1,
    userId: 1,
    score: 85,
    answers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockAttempt],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestAttemptsController],
      providers: [
        {
          provide: TestAttemptsService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TestAttemptsController>(TestAttemptsController);
    service = module.get(TestAttemptsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated test attempts', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await controller.findAll(1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 20, undefined, undefined);
    });
  });

  describe('findOne', () => {
    it('should return a test attempt by id', async () => {
      service.findById.mockResolvedValue(mockAttempt);
      const result = await controller.findOne(1);
      expect(result).toEqual(mockAttempt);
      expect(service.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should create a test attempt', async () => {
      const dto = { knowledgeTestId: 1, userId: 1, score: 90, answers: [] };
      service.create.mockResolvedValue({ ...mockAttempt, ...dto });
      const result = await controller.create(dto as any);
      expect(result).toBeDefined();
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });
});
