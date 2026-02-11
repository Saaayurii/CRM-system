import { Test, TestingModule } from '@nestjs/testing';
import { GeneratedReportsController } from '../generated-reports.controller';
import { GeneratedReportsService } from '../generated-reports.service';

describe('GeneratedReportsController', () => {
  let controller: GeneratedReportsController;
  let service: jest.Mocked<GeneratedReportsService>;

  const mockAccountId = 1;

  const mockReport = {
    id: 1,
    accountId: 1,
    name: 'January Report',
    reportTemplateId: 1,
    projectId: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockReport],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeneratedReportsController],
      providers: [
        {
          provide: GeneratedReportsService,
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

    controller = module.get<GeneratedReportsController>(GeneratedReportsController);
    service = module.get(GeneratedReportsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated reports with default params', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await controller.findAll(mockAccountId);
      expect(service.findAll).toHaveBeenCalledWith(mockAccountId, 1, 20, {});
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should pass filters to service', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      await controller.findAll(mockAccountId, 2, 10, 5, 3);
      expect(service.findAll).toHaveBeenCalledWith(mockAccountId, 2, 10, { projectId: 5, reportTemplateId: 3 });
    });
  });

  describe('findOne', () => {
    it('should return report by id', async () => {
      service.findById.mockResolvedValue(mockReport);
      const result = await controller.findOne(1, mockAccountId);
      expect(service.findById).toHaveBeenCalledWith(1, mockAccountId);
      expect(result).toEqual(mockReport);
    });
  });

  describe('create', () => {
    it('should create a generated report', async () => {
      const dto = { name: 'New Report', reportTemplateId: 1 } as any;
      service.create.mockResolvedValue(mockReport);
      const result = await controller.create(dto, mockAccountId);
      expect(service.create).toHaveBeenCalledWith(mockAccountId, dto);
      expect(result).toEqual(mockReport);
    });
  });

  describe('update', () => {
    it('should update a generated report', async () => {
      const dto = { name: 'Updated' } as any;
      service.update.mockResolvedValue(mockReport);
      const result = await controller.update(1, dto, mockAccountId);
      expect(service.update).toHaveBeenCalledWith(1, mockAccountId, dto);
      expect(result).toEqual(mockReport);
    });
  });

  describe('remove', () => {
    it('should delete a generated report', async () => {
      service.delete.mockResolvedValue(undefined);
      await controller.remove(1, mockAccountId);
      expect(service.delete).toHaveBeenCalledWith(1, mockAccountId);
    });
  });
});
