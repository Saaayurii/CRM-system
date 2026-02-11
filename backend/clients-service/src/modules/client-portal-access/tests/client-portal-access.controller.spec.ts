import { Test, TestingModule } from '@nestjs/testing';
import { ClientPortalAccessController } from '../client-portal-access.controller';
import { ClientPortalAccessService } from '../client-portal-access.service';

describe('ClientPortalAccessController', () => {
  let controller: ClientPortalAccessController;
  let service: jest.Mocked<ClientPortalAccessService>;

  const mockAccess = {
    id: 1,
    clientId: 1,
    email: 'portal@test.com',
    isActive: true,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginated = {
    data: [mockAccess],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientPortalAccessController],
      providers: [
        {
          provide: ClientPortalAccessService,
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

    controller = module.get<ClientPortalAccessController>(ClientPortalAccessController);
    service = module.get(ClientPortalAccessService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated portal access records', async () => {
      service.findAll.mockResolvedValue(mockPaginated);

      const result = await controller.findAll(1, 20);

      expect(result).toEqual(mockPaginated);
      expect(service.findAll).toHaveBeenCalledWith(1, 20, undefined);
    });

    it('should pass clientId filter', async () => {
      service.findAll.mockResolvedValue(mockPaginated);

      await controller.findAll(1, 20, 7);

      expect(service.findAll).toHaveBeenCalledWith(1, 20, 7);
    });
  });

  describe('findOne', () => {
    it('should return a single portal access record', async () => {
      service.findById.mockResolvedValue(mockAccess);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockAccess);
      expect(service.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should create and return a new portal access record', async () => {
      const dto = { clientId: 2, email: 'new@portal.com' } as any;
      service.create.mockResolvedValue({ ...mockAccess, ...dto });

      const result = await controller.create(dto);

      expect(result).toBeDefined();
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should update and return portal access record', async () => {
      const dto = { isActive: false } as any;
      service.update.mockResolvedValue({ ...mockAccess, isActive: false });

      const result = await controller.update(1, dto);

      expect(result.isActive).toBe(false);
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('remove', () => {
    it('should delete a portal access record', async () => {
      service.delete.mockResolvedValue(mockAccess as any);

      await controller.remove(1);

      expect(service.delete).toHaveBeenCalledWith(1);
    });
  });
});
