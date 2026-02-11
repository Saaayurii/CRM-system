import { Test, TestingModule } from '@nestjs/testing';
import { DefectsController } from '../defects.controller';
import { DefectsService } from '../defects.service';

describe('DefectsController', () => {
  let controller: DefectsController;
  let service: jest.Mocked<DefectsService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };
  const mockDefect = {
    id: 1,
    accountId: 1,
    projectId: 1,
    title: 'Defect',
    status: 0,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DefectsController],
      providers: [
        {
          provide: DefectsService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findAllTemplates: jest.fn(),
            findTemplateById: jest.fn(),
            createTemplate: jest.fn(),
            updateTemplate: jest.fn(),
            deleteTemplate: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DefectsController>(DefectsController);
    service = module.get(DefectsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll with parsed params', async () => {
      const expected = { data: [mockDefect], total: 1, page: 1, limit: 20, totalPages: 1 };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(mockUser, '1', '20');

      expect(result).toEqual(expected);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20, undefined, undefined);
    });

    it('should use defaults when params not provided', async () => {
      service.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });

      await controller.findAll(mockUser);

      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20, undefined, undefined);
    });

    it('should pass status and projectId filters', async () => {
      service.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });

      await controller.findAll(mockUser, '1', '20', '2', '5');

      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20, 2, 5);
    });
  });

  describe('findById', () => {
    it('should call service.findById', async () => {
      service.findById.mockResolvedValue(mockDefect);

      const result = await controller.findById(mockUser, 1);

      expect(result).toEqual(mockDefect);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should call service.create with accountId and dto', async () => {
      const dto = { title: 'New Defect', reportedDate: '2025-01-01' } as any;
      service.create.mockResolvedValue(mockDefect);

      const result = await controller.create(mockUser, dto);

      expect(result).toEqual(mockDefect);
      expect(service.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const dto = { title: 'Updated' } as any;
      service.update.mockResolvedValue({ ...mockDefect, title: 'Updated' });

      await controller.update(mockUser, 1, dto);

      expect(service.update).toHaveBeenCalledWith(1, 1, dto);
    });
  });

  describe('delete', () => {
    it('should call service.delete', async () => {
      service.delete.mockResolvedValue({ message: 'Defect with ID 1 deleted successfully' });

      const result = await controller.delete(mockUser, 1);

      expect(result).toEqual({ message: 'Defect with ID 1 deleted successfully' });
      expect(service.delete).toHaveBeenCalledWith(1, 1);
    });
  });
});
