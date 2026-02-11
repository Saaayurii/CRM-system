import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ProjectsService } from '../projects.service';
import { ProjectRepository } from '../repositories/project.repository';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let repository: jest.Mocked<ProjectRepository>;

  const now = new Date();

  const mockProject = {
    id: 1,
    accountId: 1,
    name: 'Test Project',
    code: 'PRJ-001',
    description: 'Test description',
    projectManagerId: 1,
    projectManager: { id: 1, name: 'Manager', email: 'manager@test.com' },
    clientName: 'Test Client',
    clientContact: { phone: '+123' },
    startDate: now,
    plannedEndDate: now,
    actualEndDate: null,
    budget: 100000,
    actualCost: 50000,
    status: 1,
    priority: 2,
    address: '123 Street',
    coordinates: { lat: 55.0, lng: 37.0 },
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: ProjectRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            findByCode: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            count: jest.fn(),
            addTeamMember: jest.fn(),
            removeTeamMember: jest.fn(),
            getTeamMembers: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    repository = module.get(ProjectRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated projects', async () => {
      repository.findAll.mockResolvedValue([mockProject]);
      repository.count.mockResolvedValue(1);

      const result = await service.findAll(1, 1, 20);

      expect(result).toEqual({
        projects: expect.any(Array),
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(repository.findAll).toHaveBeenCalledWith(1, {
        skip: 0,
        take: 20,
        status: undefined,
      });
      expect(repository.count).toHaveBeenCalledWith(1, undefined);
    });

    it('should pass status filter when provided', async () => {
      repository.findAll.mockResolvedValue([]);
      repository.count.mockResolvedValue(0);

      await service.findAll(1, 1, 20, 1);

      expect(repository.findAll).toHaveBeenCalledWith(1, {
        skip: 0,
        take: 20,
        status: 1,
      });
      expect(repository.count).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('findById', () => {
    it('should return a project when found and account matches', async () => {
      repository.findById.mockResolvedValue(mockProject);

      const result = await service.findById(1, 1);

      expect(result.id).toBe(1);
      expect(result.name).toBe('Test Project');
      expect(repository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when project not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId does not match', async () => {
      repository.findById.mockResolvedValue(mockProject);

      await expect(service.findById(1, 999)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('create', () => {
    const createDto = {
      accountId: 1,
      name: 'New Project',
      code: 'PRJ-002',
    };

    it('should create and return a project', async () => {
      repository.findByCode.mockResolvedValue(null);
      repository.create.mockResolvedValue({ ...mockProject, ...createDto });

      const result = await service.create(createDto, 1);

      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw ForbiddenException when accountId does not match requesting user', async () => {
      await expect(service.create(createDto, 999)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException when code already exists', async () => {
      repository.findByCode.mockResolvedValue(mockProject);

      await expect(service.create(createDto, 1)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    const updateDto = { name: 'Updated Project' };

    it('should update and return the project', async () => {
      repository.findById.mockResolvedValue(mockProject);
      repository.update.mockResolvedValue({
        ...mockProject,
        name: 'Updated Project',
      });

      const result = await service.update(1, updateDto, 1);

      expect(result.name).toBe('Updated Project');
      expect(repository.update).toHaveBeenCalledWith(1, updateDto);
    });

    it('should throw NotFoundException when project not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(999, updateDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when accountId does not match', async () => {
      repository.findById.mockResolvedValue(mockProject);

      await expect(service.update(1, updateDto, 999)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException when updating code to an existing one', async () => {
      repository.findById.mockResolvedValue(mockProject);
      repository.findByCode.mockResolvedValue({ ...mockProject, id: 2 });

      await expect(
        service.update(1, { code: 'EXISTING-CODE' }, 1),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft delete the project', async () => {
      repository.findById.mockResolvedValue(mockProject);
      repository.softDelete.mockResolvedValue(undefined);

      await service.remove(1, 1);

      expect(repository.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when project not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId does not match', async () => {
      repository.findById.mockResolvedValue(mockProject);

      await expect(service.remove(1, 999)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addTeamMember', () => {
    const addTeamMemberDto = { userId: 2, role: 'Developer' };

    it('should add a team member to the project', async () => {
      repository.findById.mockResolvedValue(mockProject);
      repository.addTeamMember.mockResolvedValue({
        projectId: 1,
        userId: 2,
        role: 'Developer',
      });

      const result = await service.addTeamMember(1, addTeamMemberDto, 1);

      expect(result).toBeDefined();
      expect(repository.addTeamMember).toHaveBeenCalledWith(1, 2, 'Developer');
    });

    it('should throw NotFoundException when project not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.addTeamMember(999, addTeamMemberDto, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when user is already a team member', async () => {
      repository.findById.mockResolvedValue(mockProject);
      repository.addTeamMember.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.addTeamMember(1, addTeamMemberDto, 1),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('removeTeamMember', () => {
    it('should remove a team member from the project', async () => {
      repository.findById.mockResolvedValue(mockProject);
      repository.removeTeamMember.mockResolvedValue(undefined);

      await service.removeTeamMember(1, 2, 1);

      expect(repository.removeTeamMember).toHaveBeenCalledWith(1, 2);
    });

    it('should throw ForbiddenException when accountId does not match', async () => {
      repository.findById.mockResolvedValue(mockProject);

      await expect(service.removeTeamMember(1, 2, 999)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getTeamMembers', () => {
    it('should return team members for a project', async () => {
      const mockMembers = [
        { userId: 1, user: { id: 1, name: 'User 1', email: 'u1@test.com' } },
      ];
      repository.findById.mockResolvedValue(mockProject);
      repository.getTeamMembers.mockResolvedValue(mockMembers);

      const result = await service.getTeamMembers(1, 1);

      expect(result).toEqual(mockMembers);
      expect(repository.getTeamMembers).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when project not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getTeamMembers(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
