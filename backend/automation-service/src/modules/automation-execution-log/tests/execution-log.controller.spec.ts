import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionLogController } from '../execution-log.controller';
import { ExecutionLogService } from '../execution-log.service';

describe('ExecutionLogController', () => {
  let controller: ExecutionLogController;
  let service: jest.Mocked<ExecutionLogService>;

  const mockLog = {
    id: 1,
    automationRuleId: 1,
    status: 'success',
    triggeredBy: 'system',
    executedAt: new Date(),
    result: { affected: 5 },
    createdAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockLog],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExecutionLogController],
      providers: [
        {
          provide: ExecutionLogService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ExecutionLogController>(ExecutionLogController);
    service = module.get(ExecutionLogService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated execution logs', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await controller.findAll(1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 20, undefined);
    });
  });

  describe('findOne', () => {
    it('should return an execution log by id', async () => {
      service.findById.mockResolvedValue(mockLog);
      const result = await controller.findOne(1);
      expect(result).toEqual(mockLog);
      expect(service.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should create an execution log', async () => {
      const dto = {
        automationRuleId: 1,
        status: 'success',
        triggeredBy: 'system',
      };
      service.create.mockResolvedValue({ ...mockLog, ...dto });
      const result = await controller.create(dto as any);
      expect(result).toBeDefined();
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });
});
