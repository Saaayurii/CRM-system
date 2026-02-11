import { Test, TestingModule } from '@nestjs/testing';
import { UserAssignmentsController } from '../user-assignments.controller';
import { UserAssignmentsService } from '../user-assignments.service';

describe('UserAssignmentsController', () => {
  let controller: UserAssignmentsController;
  let service: jest.Mocked<UserAssignmentsService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };

  const mockAssignment = {
    id: 1,
    userId: 1,
    projectId: 1,
    roleOnProject: 'Developer',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserAssignmentsController],
      providers: [
        {
          provide: UserAssignmentsService,
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

    controller = module.get<UserAssignmentsController>(
      UserAssignmentsController,
    );
    service = module.get(UserAssignmentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll with parsed parameters', async () => {
      const mockResult = {
        data: [mockAssignment],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockUser, '1', '20', '1', '2');

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 20, 1, 2);
    });

    it('should use defaults when query params are not provided', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      service.findAll.mockResolvedValue(mockResult);

      await controller.findAll(mockUser);

      expect(service.findAll).toHaveBeenCalledWith(1, 20, undefined, undefined);
    });
  });

  describe('findById', () => {
    it('should call service.findById with id', async () => {
      service.findById.mockResolvedValue(mockAssignment);

      const result = await controller.findById(mockUser, 1);

      expect(result).toEqual(mockAssignment);
      expect(service.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should call service.create with dto', async () => {
      const createDto = { userId: 1, projectId: 1, roleOnProject: 'Developer' };
      service.create.mockResolvedValue(mockAssignment);

      const result = await controller.create(mockUser, createDto);

      expect(result).toEqual(mockAssignment);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto', async () => {
      const updateDto = { roleOnProject: 'Lead Developer' };
      service.update.mockResolvedValue({
        ...mockAssignment,
        roleOnProject: 'Lead Developer',
      });

      const result = await controller.update(mockUser, 1, updateDto);

      expect(result.roleOnProject).toBe('Lead Developer');
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe('delete', () => {
    it('should call service.delete with id', async () => {
      const mockResult = {
        message: 'User assignment with ID 1 deleted successfully',
      };
      service.delete.mockResolvedValue(mockResult);

      const result = await controller.delete(mockUser, 1);

      expect(result).toEqual(mockResult);
      expect(service.delete).toHaveBeenCalledWith(1);
    });
  });
});
