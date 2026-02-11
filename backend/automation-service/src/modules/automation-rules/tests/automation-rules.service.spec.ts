import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AutomationRulesService } from '../automation-rules.service';
import { AutomationRuleRepository } from '../repositories/automation-rule.repository';

describe('AutomationRulesService', () => {
  let service: AutomationRulesService;
  let repository: jest.Mocked<AutomationRuleRepository>;

  const mockRule = {
    id: 1,
    accountId: 1,
    name: 'Auto-assign leads',
    triggerType: 'new_lead',
    conditions: {},
    actions: {},
    isActive: true,
    createdByUserId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockRule],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationRulesService,
        {
          provide: AutomationRuleRepository,
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

    service = module.get<AutomationRulesService>(AutomationRulesService);
    repository = module.get(AutomationRuleRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated automation rules', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await service.findAll(1, 1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findById', () => {
    it('should return an automation rule by id', async () => {
      repository.findById.mockResolvedValue(mockRule);
      const result = await service.findById(1, 1);
      expect(result).toEqual(mockRule);
      expect(repository.findById).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when rule not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create an automation rule', async () => {
      const dto = { name: 'New Rule', triggerType: 'new_lead', conditions: {}, actions: {} };
      repository.create.mockResolvedValue({ ...mockRule, ...dto });
      const result = await service.create(1, 1, dto as any);
      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(1, 1, dto);
    });
  });

  describe('update', () => {
    it('should update an automation rule', async () => {
      const dto = { name: 'Updated Rule' };
      repository.findById.mockResolvedValue(mockRule);
      repository.update.mockResolvedValue({ ...mockRule, ...dto });
      const result = await service.update(1, 1, dto as any);
      expect(result.name).toBe('Updated Rule');
      expect(repository.update).toHaveBeenCalledWith(1, 1, dto);
    });

    it('should throw NotFoundException when updating non-existent rule', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update(999, 1, { name: 'X' } as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete an automation rule', async () => {
      repository.findById.mockResolvedValue(mockRule);
      repository.delete.mockResolvedValue({ count: 1 });
      await service.delete(1, 1);
      expect(repository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when deleting non-existent rule', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
