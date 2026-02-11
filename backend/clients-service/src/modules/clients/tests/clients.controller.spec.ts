import { Test, TestingModule } from '@nestjs/testing';
import { ClientsController } from '../clients.controller';
import { ClientsService } from '../clients.service';

describe('ClientsController', () => {
  let controller: ClientsController;
  let service: jest.Mocked<ClientsService>;

  const mockClient = {
    id: 1,
    accountId: 1,
    name: 'Test Client',
    email: 'client@test.com',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginated = {
    data: [mockClient],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [
        {
          provide: ClientsService,
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

    controller = module.get<ClientsController>(ClientsController);
    service = module.get(ClientsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated clients', async () => {
      service.findAll.mockResolvedValue(mockPaginated);

      const result = await controller.findAll(1, 1, 20);

      expect(result).toEqual(mockPaginated);
      expect(service.findAll).toHaveBeenCalledWith(
        1,
        1,
        20,
        undefined,
        undefined,
      );
    });

    it('should pass optional filters to service', async () => {
      service.findAll.mockResolvedValue(mockPaginated);

      await controller.findAll(1, 1, 10, 'active', 5);

      expect(service.findAll).toHaveBeenCalledWith(1, 1, 10, 'active', 5);
    });
  });

  describe('findOne', () => {
    it('should return a single client', async () => {
      service.findById.mockResolvedValue(mockClient);

      const result = await controller.findOne(1, 1);

      expect(result).toEqual(mockClient);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should create and return a new client', async () => {
      const dto = { name: 'New Client' } as any;
      service.create.mockResolvedValue({ ...mockClient, name: 'New Client' });

      const result = await controller.create(dto, 1);

      expect(result).toBeDefined();
      expect(service.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('update', () => {
    it('should update and return the client', async () => {
      const dto = { name: 'Updated' } as any;
      service.update.mockResolvedValue({ ...mockClient, name: 'Updated' });

      const result = await controller.update(1, dto, 1);

      expect(result.name).toBe('Updated');
      expect(service.update).toHaveBeenCalledWith(1, 1, dto);
    });
  });

  describe('remove', () => {
    it('should delete a client', async () => {
      service.delete.mockResolvedValue({ count: 1 } as any);

      await controller.remove(1, 1);

      expect(service.delete).toHaveBeenCalledWith(1, 1);
    });
  });
});
