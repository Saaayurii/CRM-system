import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserAssignmentsService } from '../user-assignments.service';
import { UserAssignmentRepository } from '../repositories/user-assignment.repository';

describe('UserAssignmentsService', () => {
  let service: UserAssignmentsService;
  let repository: jest.Mocked<UserAssignmentRepository>;

  const mockAssignment = {
    id: 1,
    userId: 1,
    projectId: 1,
    constructionSiteId: null,
    teamId: null,
    roleOnProject: 'Developer',
    assignedAt: new Date(),
    removedAt: null,
    hourlyRate: 50,
    dailyRate: 400,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    project: { id: 1, name: 'Project' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAssignmentsService,
        {
          provide: UserAssignmentRepository,
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

    service = module.get<UserAssignmentsService>(UserAssignmentsService);
    repository = module.get(UserAssignmentRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated user assignments', async () => {
      const mockResult = { data: [mockAssignment], total: 1, page: 1, limit: 20, totalPages: 1 };
      repository.findAll.mockResolvedValue(mockResult);

      const result = await service.findAll(1, 20);

      expect(result).toEqual(mockResult);
      expect(repository.findAll).toHaveBeenCalledWith(1, 20, undefined, undefined);
    });

    it('should pass projectId and userId filters', async () => {
      const mockResult = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      repository.findAll.mockResolvedValue(mockResult);

      await service.findAll(1, 20, 1, 2);

      expect(repository.findAll).toHaveBeenCalledWith(1, 20, 1, 2);
    });
  });

  describe('findById', () => {
    it('should return a user assignment when found', async () => {
      repository.findById.mockResolvedValue(mockAssignment);

      const result = await service.findById(1);

      expect(result).toEqual(mockAssignment);
      expect(repository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when assignment not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a user assignment', async () => {
      const createDto = {
        userId: 1,
        projectId: 1,
        roleOnProject: 'Developer',
        assignedAt: '2024-01-01',
      };
      repository.create.mockResolvedValue(mockAssignment);

      const result = await service.create(createDto);

      expect(result).toEqual(mockAssignment);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          projectId: 1,
          roleOnProject: 'Developer',
        }),
      );
    });

    it('should handle undefined date fields', async () => {
      const createDto = { userId: 1, projectId: 1 };
      repository.create.mockResolvedValue(mockAssignment);

      await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          assignedAt: undefined,
          removedAt: undefined,
        }),
      );
    });
  });

  describe('update', () => {
    it('should update and return the user assignment', async () => {
      const updateDto = { roleOnProject: 'Lead Developer' };
      repository.findById.mockResolvedValue(mockAssignment);
      repository.update.mockResolvedValue(undefined);

      const result = await service.update(1, updateDto);

      expect(result).toBeDefined();
      expect(repository.update).toHaveBeenCalledWith(1, expect.objectContaining({ roleOnProject: 'Lead Developer' }));
    });

    it('should throw NotFoundException when assignment not found for update', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(999, { roleOnProject: 'Lead' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete the user assignment and return success message', async () => {
      repository.findById.mockResolvedValue(mockAssignment);
      repository.delete.mockResolvedValue(undefined);

      const result = await service.delete(1);

      expect(result).toEqual({ message: 'User assignment with ID 1 deleted successfully' });
      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when assignment not found for deletion', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });
});
