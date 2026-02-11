import { Test, TestingModule } from '@nestjs/testing';
import { MaterialRequestsController } from '../material-requests.controller';
import { MaterialRequestsService } from '../material-requests.service';

describe('MaterialRequestsController', () => {
  let controller: MaterialRequestsController;
  let service: jest.Mocked<MaterialRequestsService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };
  const mockRequest = {
    id: 1,
    accountId: 1,
    requestNumber: 'REQ-001',
    status: 0,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaterialRequestsController],
      providers: [
        {
          provide: MaterialRequestsService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            addItem: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MaterialRequestsController>(MaterialRequestsController);
    service = module.get(MaterialRequestsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll with correct params', async () => {
      const expected = { materialRequests: [mockRequest], total: 1, page: 1, limit: 20 };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(mockUser, 1, 20);

      expect(result).toEqual(expected);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20, undefined);
    });

    it('should use defaults when params not provided', async () => {
      service.findAll.mockResolvedValue({ materialRequests: [], total: 0, page: 1, limit: 20 });

      await controller.findAll(mockUser);

      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20, undefined);
    });
  });

  describe('findOne', () => {
    it('should call service.findById', async () => {
      service.findById.mockResolvedValue(mockRequest);

      const result = await controller.findOne(mockUser, 1);

      expect(result).toEqual(mockRequest);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should call service.create with dto and accountId', async () => {
      const dto = { accountId: 1, requestNumber: 'REQ-002' } as any;
      service.create.mockResolvedValue(mockRequest);

      const result = await controller.create(mockUser, dto);

      expect(result).toEqual(mockRequest);
      expect(service.create).toHaveBeenCalledWith(dto, 1);
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const dto = { status: 1 } as any;
      service.update.mockResolvedValue({ ...mockRequest, status: 1 });

      const result = await controller.update(mockUser, 1, dto);

      expect(service.update).toHaveBeenCalledWith(1, dto, 1);
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(mockUser, 1);

      expect(service.remove).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('addItem', () => {
    it('should call service.addItem', async () => {
      const dto = { materialId: 1, requestedQuantity: 10, unit: 'kg' } as any;
      service.addItem.mockResolvedValue({ id: 1 });

      const result = await controller.addItem(mockUser, 1, dto);

      expect(service.addItem).toHaveBeenCalledWith(1, dto, 1);
    });
  });
});
