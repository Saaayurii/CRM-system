import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from '../projects.controller';
import { ProjectsService } from '../projects.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: jest.Mocked<ProjectsService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };

  const mockProjectResponse = {
    id: 1,
    accountId: 1,
    name: 'Test Project',
    code: 'PRJ-001',
    description: 'Test',
    projectManagerId: 1,
    projectManager: { id: 1, name: 'Manager', email: 'manager@test.com' },
    clientName: 'Client',
    clientContact: {},
    startDate: new Date(),
    plannedEndDate: new Date(),
    actualEndDate: undefined,
    budget: 100000,
    actualCost: 50000,
    status: 1,
    priority: 2,
    address: '123 Street',
    coordinates: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            addTeamMember: jest.fn(),
            removeTeamMember: jest.fn(),
            getTeamMembers: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    service = module.get(ProjectsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll with correct parameters', async () => {
      const mockResult = { projects: [mockProjectResponse], total: 1, page: 1, limit: 20 };
      service.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockUser, 1, 20, 1);

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20, 1);
    });

    it('should use default values when page and limit are not provided', async () => {
      const mockResult = { projects: [], total: 0, page: 1, limit: 20 };
      service.findAll.mockResolvedValue(mockResult);

      await controller.findAll(mockUser);

      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20, undefined);
    });
  });

  describe('findOne', () => {
    it('should call service.findById with correct parameters', async () => {
      service.findById.mockResolvedValue(mockProjectResponse);

      const result = await controller.findOne(mockUser, 1);

      expect(result).toEqual(mockProjectResponse);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should call service.create with dto and accountId', async () => {
      const createDto = { accountId: 1, name: 'New Project' };
      service.create.mockResolvedValue(mockProjectResponse);

      const result = await controller.create(mockUser, createDto);

      expect(result).toEqual(mockProjectResponse);
      expect(service.create).toHaveBeenCalledWith(createDto, 1);
    });
  });

  describe('update', () => {
    it('should call service.update with id, dto and accountId', async () => {
      const updateDto = { name: 'Updated' };
      service.update.mockResolvedValue({ ...mockProjectResponse, name: 'Updated' });

      const result = await controller.update(mockUser, 1, updateDto);

      expect(result.name).toBe('Updated');
      expect(service.update).toHaveBeenCalledWith(1, updateDto, 1);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id and accountId', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(mockUser, 1);

      expect(service.remove).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('getTeamMembers', () => {
    it('should call service.getTeamMembers with id and accountId', async () => {
      const mockMembers = [{ userId: 1, user: { id: 1, name: 'User', email: 'u@test.com' } }];
      service.getTeamMembers.mockResolvedValue(mockMembers);

      const result = await controller.getTeamMembers(mockUser, 1);

      expect(result).toEqual(mockMembers);
      expect(service.getTeamMembers).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('addTeamMember', () => {
    it('should call service.addTeamMember with correct parameters', async () => {
      const dto = { userId: 2, role: 'Developer' };
      const mockResult = { projectId: 1, userId: 2, role: 'Developer' };
      service.addTeamMember.mockResolvedValue(mockResult);

      const result = await controller.addTeamMember(mockUser, 1, dto);

      expect(result).toEqual(mockResult);
      expect(service.addTeamMember).toHaveBeenCalledWith(1, dto, 1);
    });
  });

  describe('removeTeamMember', () => {
    it('should call service.removeTeamMember with correct parameters', async () => {
      service.removeTeamMember.mockResolvedValue(undefined);

      await controller.removeTeamMember(mockUser, 1, 2);

      expect(service.removeTeamMember).toHaveBeenCalledWith(1, 2, 1);
    });
  });
});
