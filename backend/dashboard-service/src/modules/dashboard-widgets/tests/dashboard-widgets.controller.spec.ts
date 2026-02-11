import { Test, TestingModule } from '@nestjs/testing';
import { DashboardWidgetsController } from '../dashboard-widgets.controller';
import { DashboardWidgetsService } from '../dashboard-widgets.service';

describe('DashboardWidgetsController', () => {
  let controller: DashboardWidgetsController;
  let service: jest.Mocked<DashboardWidgetsService>;

  const mockWidget = {
    id: 1,
    userId: 1,
    type: 'chart',
    title: 'Sales Chart',
    position: 0,
    config: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginated = {
    data: [mockWidget],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardWidgetsController],
      providers: [
        {
          provide: DashboardWidgetsService,
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

    controller = module.get<DashboardWidgetsController>(DashboardWidgetsController);
    service = module.get(DashboardWidgetsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated widgets', async () => {
      service.findAll.mockResolvedValue(mockPaginated);

      const result = await controller.findAll(1, 1, 20);

      expect(result).toEqual(mockPaginated);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findOne', () => {
    it('should return a single widget by id', async () => {
      service.findById.mockResolvedValue(mockWidget);

      const result = await controller.findOne(1, 1);

      expect(result).toEqual(mockWidget);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should create and return a new widget', async () => {
      const dto = { type: 'table', title: 'New Widget', position: 2 } as any;
      service.create.mockResolvedValue({ ...mockWidget, ...dto });

      const result = await controller.create(dto, 1);

      expect(result).toBeDefined();
      expect(service.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('update', () => {
    it('should update and return the widget', async () => {
      const dto = { title: 'Updated' } as any;
      service.update.mockResolvedValue({ ...mockWidget, title: 'Updated' });

      const result = await controller.update(1, dto, 1);

      expect(result.title).toBe('Updated');
      expect(service.update).toHaveBeenCalledWith(1, 1, dto);
    });
  });

  describe('remove', () => {
    it('should delete a widget', async () => {
      service.delete.mockResolvedValue({ count: 1 } as any);

      await controller.remove(1, 1);

      expect(service.delete).toHaveBeenCalledWith(1, 1);
    });
  });
});
