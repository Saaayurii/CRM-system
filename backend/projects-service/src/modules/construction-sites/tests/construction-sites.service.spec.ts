import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConstructionSitesService } from '../construction-sites.service';
import { ConstructionSiteRepository } from '../repositories/construction-site.repository';

describe('ConstructionSitesService', () => {
  let service: ConstructionSitesService;
  let repository: jest.Mocked<ConstructionSiteRepository>;

  const mockSite = {
    id: 1,
    projectId: 1,
    name: 'Test Site',
    code: 'SITE-001',
    siteType: 'residential',
    address: '123 Street',
    coordinates: { lat: 55.0, lng: 37.0 },
    areaSize: 500,
    foremanId: 1,
    status: 0,
    startDate: new Date(),
    plannedEndDate: new Date(),
    actualEndDate: null,
    description: 'Test',
    photos: [],
    documents: [],
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    project: { id: 1, name: 'Project' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConstructionSitesService,
        {
          provide: ConstructionSiteRepository,
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

    service = module.get<ConstructionSitesService>(ConstructionSitesService);
    repository = module.get(ConstructionSiteRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated construction sites', async () => {
      const mockResult = {
        data: [mockSite],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      repository.findAll.mockResolvedValue(mockResult);

      const result = await service.findAll(1, 20);

      expect(result).toEqual(mockResult);
      expect(repository.findAll).toHaveBeenCalledWith(
        undefined,
        1,
        20,
        undefined,
      );
    });

    it('should pass projectId and status filters', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      repository.findAll.mockResolvedValue(mockResult);

      await service.findAll(1, 20, 1, 0);

      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, 0);
    });
  });

  describe('findById', () => {
    it('should return a construction site when found', async () => {
      repository.findById.mockResolvedValue(mockSite);

      const result = await service.findById(1);

      expect(result).toEqual(mockSite);
      expect(repository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when site not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a construction site', async () => {
      const createDto = {
        projectId: 1,
        name: 'New Site',
        address: '456 Avenue',
        startDate: '2024-01-01',
        plannedEndDate: '2024-12-31',
      };
      repository.create.mockResolvedValue(mockSite);

      const result = await service.create(createDto);

      expect(result).toEqual(mockSite);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 1,
          name: 'New Site',
          address: '456 Avenue',
        }),
      );
    });

    it('should handle optional date fields as undefined', async () => {
      const createDto = {
        projectId: 1,
        name: 'New Site',
        address: '456 Avenue',
      };
      repository.create.mockResolvedValue(mockSite);

      await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: undefined,
          plannedEndDate: undefined,
          actualEndDate: undefined,
        }),
      );
    });
  });

  describe('update', () => {
    it('should update and return the construction site', async () => {
      const updateDto = { name: 'Updated Site' };
      repository.findById.mockResolvedValue(mockSite);
      repository.update.mockResolvedValue(undefined);

      const result = await service.update(1, updateDto);

      expect(result).toBeDefined();
      expect(repository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: 'Updated Site' }),
      );
    });

    it('should throw NotFoundException when site not found for update', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(999, { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete the construction site and return success message', async () => {
      repository.findById.mockResolvedValue(mockSite);
      repository.delete.mockResolvedValue(undefined);

      const result = await service.delete(1);

      expect(result).toEqual({
        message: 'Construction site with ID 1 deleted successfully',
      });
      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when site not found for deletion', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });
});
