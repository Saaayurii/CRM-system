import { Test, TestingModule } from '@nestjs/testing';
import { ReportTemplatesController } from '../report-templates.controller';
import { ReportTemplatesService } from '../report-templates.service';

describe('ReportTemplatesController', () => {
  let controller: ReportTemplatesController;
  let service: jest.Mocked<ReportTemplatesService>;

  const mockAccountId = 1;

  const mockTemplate = {
    id: 1,
    accountId: 1,
    name: 'Monthly Report',
    description: 'Monthly project report template',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockTemplate],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportTemplatesController],
      providers: [
        {
          provide: ReportTemplatesService,
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

    controller = module.get<ReportTemplatesController>(
      ReportTemplatesController,
    );
    service = module.get(ReportTemplatesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated templates with default params', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await controller.findAll(mockAccountId);
      expect(service.findAll).toHaveBeenCalledWith(mockAccountId, 1, 20);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should pass custom page and limit', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      await controller.findAll(mockAccountId, 3, 15);
      expect(service.findAll).toHaveBeenCalledWith(mockAccountId, 3, 15);
    });
  });

  describe('findOne', () => {
    it('should return template by id', async () => {
      service.findById.mockResolvedValue(mockTemplate);
      const result = await controller.findOne(1, mockAccountId);
      expect(service.findById).toHaveBeenCalledWith(1, mockAccountId);
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('create', () => {
    it('should create a report template', async () => {
      const dto = { name: 'New Template' } as any;
      service.create.mockResolvedValue(mockTemplate);
      const result = await controller.create(dto, mockAccountId);
      expect(service.create).toHaveBeenCalledWith(mockAccountId, dto);
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('update', () => {
    it('should update a report template', async () => {
      const dto = { name: 'Updated' } as any;
      service.update.mockResolvedValue(mockTemplate);
      const result = await controller.update(1, dto, mockAccountId);
      expect(service.update).toHaveBeenCalledWith(1, mockAccountId, dto);
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('remove', () => {
    it('should delete a report template', async () => {
      service.delete.mockResolvedValue(undefined);
      await controller.remove(1, mockAccountId);
      expect(service.delete).toHaveBeenCalledWith(1, mockAccountId);
    });
  });
});
