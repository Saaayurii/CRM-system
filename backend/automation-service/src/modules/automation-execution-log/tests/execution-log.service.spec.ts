import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ExecutionLogService } from '../execution-log.service';
import { ExecutionLogRepository } from '../repositories/execution-log.repository';

describe('ExecutionLogService', () => {
  let service: ExecutionLogService;
  let repository: jest.Mocked<ExecutionLogRepository>;

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
      providers: [
        ExecutionLogService,
        {
          provide: ExecutionLogRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ExecutionLogService>(ExecutionLogService);
    repository = module.get(ExecutionLogRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated execution logs', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await service.findAll(1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(repository.findAll).toHaveBeenCalledWith(1, 20, undefined);
    });

    it('should pass automationRuleId filter', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      await service.findAll(1, 20, 5);
      expect(repository.findAll).toHaveBeenCalledWith(1, 20, 5);
    });
  });

  describe('findById', () => {
    it('should return an execution log by id', async () => {
      repository.findById.mockResolvedValue(mockLog);
      const result = await service.findById(1);
      expect(result).toEqual(mockLog);
      expect(repository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when log not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });

    it('should include the id in the error message', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(42)).rejects.toThrow('Execution log #42 not found');
    });
  });

  describe('create', () => {
    it('should create an execution log', async () => {
      const dto = { automationRuleId: 1, status: 'success', triggeredBy: 'system' };
      repository.create.mockResolvedValue({ ...mockLog, ...dto });
      const result = await service.create(dto as any);
      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(dto);
    });
  });
});
