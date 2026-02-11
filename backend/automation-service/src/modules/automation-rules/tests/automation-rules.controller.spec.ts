import { Test, TestingModule } from '@nestjs/testing';
import { AutomationRulesController } from '../automation-rules.controller';
import { AutomationRulesService } from '../automation-rules.service';

describe('AutomationRulesController', () => {
  let controller: AutomationRulesController;
  let service: jest.Mocked<AutomationRulesService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };

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
      controllers: [AutomationRulesController],
      providers: [
        {
          provide: AutomationRulesService,
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

    controller = module.get<AutomationRulesController>(AutomationRulesController);
    service = module.get(AutomationRulesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated automation rules', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await controller.findAll(1, 1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findOne', () => {
    it('should return an automation rule by id', async () => {
      service.findById.mockResolvedValue(mockRule);
      const result = await controller.findOne(1, 1);
      expect(result).toEqual(mockRule);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should create an automation rule', async () => {
      const dto = { name: 'New Rule', triggerType: 'new_lead', conditions: {}, actions: {} };
      service.create.mockResolvedValue({ ...mockRule, ...dto });
      const result = await controller.create(dto as any, 1, 1);
      expect(result).toBeDefined();
      expect(service.create).toHaveBeenCalledWith(1, 1, dto);
    });
  });

  describe('update', () => {
    it('should update an automation rule', async () => {
      const dto = { name: 'Updated' };
      service.update.mockResolvedValue({ ...mockRule, ...dto });
      const result = await controller.update(1, dto as any, 1);
      expect(result.name).toBe('Updated');
      expect(service.update).toHaveBeenCalledWith(1, 1, dto);
    });
  });

  describe('remove', () => {
    it('should delete an automation rule', async () => {
      service.delete.mockResolvedValue({ count: 1 } as any);
      await controller.remove(1, 1);
      expect(service.delete).toHaveBeenCalledWith(1, 1);
    });
  });
});
