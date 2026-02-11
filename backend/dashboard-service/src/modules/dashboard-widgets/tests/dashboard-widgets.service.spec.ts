import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DashboardWidgetsService } from '../dashboard-widgets.service';
import { DashboardWidgetRepository } from '../repositories/dashboard-widget.repository';

describe('DashboardWidgetsService', () => {
  let service: DashboardWidgetsService;
  let repository: jest.Mocked<DashboardWidgetRepository>;

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
      providers: [
        DashboardWidgetsService,
        {
          provide: DashboardWidgetRepository,
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

    service = module.get<DashboardWidgetsService>(DashboardWidgetsService);
    repository = module.get(DashboardWidgetRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated widgets for a user', async () => {
      repository.findAll.mockResolvedValue(mockPaginated);

      const result = await service.findAll(1, 1, 20);

      expect(result).toEqual(mockPaginated);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20);
    });

    it('should pass pagination parameters correctly', async () => {
      repository.findAll.mockResolvedValue({ ...mockPaginated, page: 2, limit: 10 });

      await service.findAll(1, 2, 10);

      expect(repository.findAll).toHaveBeenCalledWith(1, 2, 10);
    });
  });

  describe('findById', () => {
    it('should return a widget when found', async () => {
      repository.findById.mockResolvedValue(mockWidget);

      const result = await service.findById(1, 1);

      expect(result).toEqual(mockWidget);
      expect(repository.findById).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when widget is not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findById(999, 1)).rejects.toThrow('Dashboard widget #999 not found');
    });
  });

  describe('create', () => {
    it('should create and return a new widget', async () => {
      const dto = { type: 'chart', title: 'New Widget', position: 1 } as any;
      repository.create.mockResolvedValue({ ...mockWidget, ...dto });

      const result = await service.create(1, dto);

      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('update', () => {
    it('should update an existing widget', async () => {
      const dto = { title: 'Updated Widget' } as any;
      repository.findById.mockResolvedValue(mockWidget);
      repository.update.mockResolvedValue({ ...mockWidget, title: 'Updated Widget' });

      const result = await service.update(1, 1, dto);

      expect(result.title).toBe('Updated Widget');
      expect(repository.update).toHaveBeenCalledWith(1, 1, dto);
    });

    it('should throw NotFoundException when updating non-existent widget', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(999, 1, {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete an existing widget', async () => {
      repository.findById.mockResolvedValue(mockWidget);
      repository.delete.mockResolvedValue({ count: 1 });

      const result = await service.delete(1, 1);

      expect(repository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when deleting non-existent widget', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
