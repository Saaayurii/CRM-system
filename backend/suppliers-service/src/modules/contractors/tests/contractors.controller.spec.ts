import { Test, TestingModule } from '@nestjs/testing';
import { ContractorsController } from '../contractors.controller';
import { ContractorsService } from '../contractors.service';

describe('ContractorsController', () => {
  let controller: ContractorsController;
  let service: jest.Mocked<ContractorsService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };
  const mockContractor = {
    id: 1,
    accountId: 1,
    name: 'Contractor',
    legalName: 'Contractor LLC',
    status: 1,
    assignments: [],
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContractorsController],
      providers: [
        {
          provide: ContractorsService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            getAssignments: jest.fn(),
            addAssignment: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ContractorsController>(ContractorsController);
    service = module.get(ContractorsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll with correct params', async () => {
      const expected = {
        contractors: [mockContractor],
        total: 1,
        page: 1,
        limit: 20,
      };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(mockUser, 1, 20);

      expect(result).toEqual(expected);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findOne', () => {
    it('should call service.findById', async () => {
      service.findById.mockResolvedValue(mockContractor);

      const result = await controller.findOne(mockUser, 1);

      expect(result).toEqual(mockContractor);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should call service.create', async () => {
      const dto = { accountId: 1, name: 'New' } as any;
      service.create.mockResolvedValue(mockContractor);

      const result = await controller.create(mockUser, dto);

      expect(result).toEqual(mockContractor);
      expect(service.create).toHaveBeenCalledWith(dto, 1);
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const dto = { name: 'Updated' } as any;
      service.update.mockResolvedValue({ ...mockContractor, name: 'Updated' });

      await controller.update(mockUser, 1, dto);

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

  describe('getAssignments', () => {
    it('should call service.getAssignments', async () => {
      const assignments = [{ id: 1, contractorId: 1 }];
      service.getAssignments.mockResolvedValue(assignments);

      const result = await controller.getAssignments(mockUser, 1);

      expect(result).toEqual(assignments);
      expect(service.getAssignments).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('addAssignment', () => {
    it('should call service.addAssignment', async () => {
      const dto = { projectId: 1, workType: 'electrical' } as any;
      service.addAssignment.mockResolvedValue({ id: 1 });

      await controller.addAssignment(mockUser, 1, dto);

      expect(service.addAssignment).toHaveBeenCalledWith(1, dto, 1);
    });
  });
});
