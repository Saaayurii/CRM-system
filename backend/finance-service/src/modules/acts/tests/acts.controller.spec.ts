import { Test, TestingModule } from '@nestjs/testing';
import { ActsController } from '../acts.controller';
import { ActsService } from '../acts.service';

describe('ActsController', () => {
  let controller: ActsController;
  let service: jest.Mocked<ActsService>;

  const mockAct = {
    id: 1,
    accountId: 1,
    title: 'Test Act',
    preparedByUserId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
  };

  const mockPaginatedResult = {
    data: [mockAct],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActsController],
      providers: [
        {
          provide: ActsService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createItem: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ActsController>(ActsController);
    service = module.get(ActsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should delegate to service.findAll', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await controller.findAll(1, 1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findOne', () => {
    it('should delegate to service.findById', async () => {
      service.findById.mockResolvedValue(mockAct);
      const result = await controller.findOne(1, 1);
      expect(result).toEqual(mockAct);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should delegate to service.create', async () => {
      const dto = { title: 'Test Act' } as any;
      service.create.mockResolvedValue(mockAct);
      const result = await controller.create(dto, 1, 1);
      expect(result).toEqual(mockAct);
      expect(service.create).toHaveBeenCalledWith(1, dto, 1);
    });
  });

  describe('update', () => {
    it('should delegate to service.update', async () => {
      const dto = { title: 'Updated Act' } as any;
      service.update.mockResolvedValue({ ...mockAct, title: 'Updated Act' });
      const result = await controller.update(1, dto, 1);
      expect(service.update).toHaveBeenCalledWith(1, 1, dto);
    });
  });

  describe('remove', () => {
    it('should delegate to service.delete', async () => {
      service.delete.mockResolvedValue({ count: 1 } as any);
      await controller.remove(1, 1);
      expect(service.delete).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('createItem', () => {
    it('should delegate to service.createItem', async () => {
      const dto = {
        description: 'Service item',
        quantity: 2,
        price: 100,
      } as any;
      const mockItem = { id: 1, actId: 1, ...dto };
      service.createItem.mockResolvedValue(mockItem);
      const result = await controller.createItem(1, dto, 1);
      expect(result).toEqual(mockItem);
      expect(service.createItem).toHaveBeenCalledWith(1, 1, dto);
    });
  });
});
