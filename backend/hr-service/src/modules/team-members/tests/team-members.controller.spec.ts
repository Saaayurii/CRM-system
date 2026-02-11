import { Test, TestingModule } from '@nestjs/testing';
import { TeamMembersController } from '../team-members.controller';
import { TeamMembersService } from '../team-members.service';

describe('TeamMembersController', () => {
  let controller: TeamMembersController;
  let service: jest.Mocked<TeamMembersService>;

  const mockMember = {
    id: 1,
    teamId: 1,
    userId: 10,
    roleInTeam: 'developer',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    data: [mockMember],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamMembersController],
      providers: [
        {
          provide: TeamMembersService,
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

    controller = module.get<TeamMembersController>(TeamMembersController);
    service = module.get(TeamMembersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should delegate to service.findAll', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await controller.findAll();
      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 20, undefined, undefined);
    });

    it('should pass teamId and userId filters', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      await controller.findAll('1', '10', '1', '20');
      expect(service.findAll).toHaveBeenCalledWith(1, 20, 1, 10);
    });
  });

  describe('findById', () => {
    it('should delegate to service.findById', async () => {
      service.findById.mockResolvedValue(mockMember);
      const result = await controller.findById(1);
      expect(result).toEqual(mockMember);
      expect(service.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should delegate to service.create', async () => {
      const dto = { teamId: 1, userId: 10, roleInTeam: 'developer' } as any;
      service.create.mockResolvedValue(mockMember);
      const result = await controller.create(dto);
      expect(result).toEqual(mockMember);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should delegate to service.update', async () => {
      const dto = { roleInTeam: 'lead' } as any;
      service.update.mockResolvedValue({ ...mockMember, roleInTeam: 'lead' });
      await controller.update(1, dto);
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('delete', () => {
    it('should delegate to service.delete', async () => {
      service.delete.mockResolvedValue(mockMember);
      await controller.delete(1);
      expect(service.delete).toHaveBeenCalledWith(1);
    });
  });
});
