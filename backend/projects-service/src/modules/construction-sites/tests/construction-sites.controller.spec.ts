import { Test, TestingModule } from '@nestjs/testing';
import { ConstructionSitesController } from '../construction-sites.controller';
import { ConstructionSitesService } from '../construction-sites.service';

describe('ConstructionSitesController', () => {
  let controller: ConstructionSitesController;
  let service: jest.Mocked<ConstructionSitesService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };

  const mockSite = {
    id: 1,
    projectId: 1,
    name: 'Test Site',
    address: '123 Street',
    status: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConstructionSitesController],
      providers: [
        {
          provide: ConstructionSitesService,
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

    controller = module.get<ConstructionSitesController>(ConstructionSitesController);
    service = module.get(ConstructionSitesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll with parsed parameters', async () => {
      const mockResult = { data: [mockSite], total: 1, page: 1, limit: 20, totalPages: 1 };
      service.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockUser, '1', '20', '1', '0');

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 20, 1, 0);
    });

    it('should use defaults when query params are not provided', async () => {
      const mockResult = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      service.findAll.mockResolvedValue(mockResult);

      await controller.findAll(mockUser);

      expect(service.findAll).toHaveBeenCalledWith(1, 20, undefined, undefined);
    });
  });

  describe('findById', () => {
    it('should call service.findById with id', async () => {
      service.findById.mockResolvedValue(mockSite);

      const result = await controller.findById(mockUser, 1);

      expect(result).toEqual(mockSite);
      expect(service.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should call service.create with dto', async () => {
      const createDto = { projectId: 1, name: 'New Site', address: '456 Avenue' };
      service.create.mockResolvedValue(mockSite);

      const result = await controller.create(mockUser, createDto);

      expect(result).toEqual(mockSite);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto', async () => {
      const updateDto = { name: 'Updated Site' };
      service.update.mockResolvedValue({ ...mockSite, name: 'Updated Site' });

      const result = await controller.update(mockUser, 1, updateDto);

      expect(result.name).toBe('Updated Site');
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe('delete', () => {
    it('should call service.delete with id', async () => {
      const mockResult = { message: 'Construction site with ID 1 deleted successfully' };
      service.delete.mockResolvedValue(mockResult);

      const result = await controller.delete(mockUser, 1);

      expect(result).toEqual(mockResult);
      expect(service.delete).toHaveBeenCalledWith(1);
    });
  });
});
