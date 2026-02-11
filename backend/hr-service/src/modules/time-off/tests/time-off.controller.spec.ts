import { Test, TestingModule } from '@nestjs/testing';
import { TimeOffController } from '../time-off.controller';
import { TimeOffService } from '../time-off.service';

describe('TimeOffController', () => {
  let controller: TimeOffController;
  let service: jest.Mocked<TimeOffService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };

  const mockTimeOff = {
    id: 1,
    userId: 1,
    type: 'vacation',
    startDate: new Date(),
    endDate: new Date(),
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockTimeOff],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimeOffController],
      providers: [
        {
          provide: TimeOffService,
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

    controller = module.get<TimeOffController>(TimeOffController);
    service = module.get(TimeOffService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should delegate to service.findAll with user.id', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await controller.findAll(mockUser);
      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findById', () => {
    it('should delegate to service.findById', async () => {
      service.findById.mockResolvedValue(mockTimeOff);
      const result = await controller.findById(1, mockUser);
      expect(result).toEqual(mockTimeOff);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should delegate to service.create with user.id', async () => {
      const dto = {
        type: 'vacation',
        startDate: '2025-06-01',
        endDate: '2025-06-10',
      } as any;
      service.create.mockResolvedValue(mockTimeOff);
      const result = await controller.create(dto, mockUser);
      expect(result).toEqual(mockTimeOff);
      expect(service.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('update', () => {
    it('should delegate to service.update', async () => {
      const dto = { status: 'approved' } as any;
      service.update.mockResolvedValue({ ...mockTimeOff, status: 'approved' });
      await controller.update(1, dto, mockUser);
      expect(service.update).toHaveBeenCalledWith(1, 1, dto);
    });
  });

  describe('delete', () => {
    it('should delegate to service.delete', async () => {
      service.delete.mockResolvedValue(mockTimeOff);
      await controller.delete(1, mockUser);
      expect(service.delete).toHaveBeenCalledWith(1, 1);
    });
  });
});
