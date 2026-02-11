import { Test, TestingModule } from '@nestjs/testing';
import { ClientInteractionsController } from '../client-interactions.controller';
import { ClientInteractionsService } from '../client-interactions.service';

describe('ClientInteractionsController', () => {
  let controller: ClientInteractionsController;
  let service: jest.Mocked<ClientInteractionsService>;

  const mockInteraction = {
    id: 1,
    clientId: 1,
    type: 'call',
    description: 'Follow-up call',
    interactionDate: new Date(),
    nextActionDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginated = {
    data: [mockInteraction],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientInteractionsController],
      providers: [
        {
          provide: ClientInteractionsService,
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

    controller = module.get<ClientInteractionsController>(
      ClientInteractionsController,
    );
    service = module.get(ClientInteractionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated interactions', async () => {
      service.findAll.mockResolvedValue(mockPaginated);

      const result = await controller.findAll(1, 20);

      expect(result).toEqual(mockPaginated);
      expect(service.findAll).toHaveBeenCalledWith(1, 20, undefined);
    });

    it('should pass clientId filter', async () => {
      service.findAll.mockResolvedValue(mockPaginated);

      await controller.findAll(1, 20, 3);

      expect(service.findAll).toHaveBeenCalledWith(1, 20, 3);
    });
  });

  describe('findOne', () => {
    it('should return a single interaction', async () => {
      service.findById.mockResolvedValue(mockInteraction);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockInteraction);
      expect(service.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should create and return a new interaction', async () => {
      const dto = { clientId: 1, type: 'meeting', description: 'Demo' } as any;
      service.create.mockResolvedValue({ ...mockInteraction, ...dto });

      const result = await controller.create(dto);

      expect(result).toBeDefined();
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should update and return the interaction', async () => {
      const dto = { description: 'Updated' } as any;
      service.update.mockResolvedValue({
        ...mockInteraction,
        description: 'Updated',
      });

      const result = await controller.update(1, dto);

      expect(result.description).toBe('Updated');
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('remove', () => {
    it('should delete an interaction', async () => {
      service.delete.mockResolvedValue(mockInteraction as any);

      await controller.remove(1);

      expect(service.delete).toHaveBeenCalledWith(1);
    });
  });
});
