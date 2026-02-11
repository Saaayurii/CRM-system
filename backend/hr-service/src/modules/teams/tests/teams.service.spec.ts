import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TeamsService } from '../teams.service';
import { TeamRepository } from '../repositories/team.repository';

describe('TeamsService', () => {
  let service: TeamsService;
  let repository: jest.Mocked<TeamRepository>;

  const mockTeam = {
    id: 1,
    accountId: 1,
    name: 'Engineering',
    description: 'Engineering team',
    teamLeadId: 5,
    status: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [],
  };

  const mockPaginatedResult = {
    data: [mockTeam],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: TeamRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findMembers: jest.fn(),
            addMember: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
    repository = module.get(TeamRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated teams', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await service.findAll(1, 1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, undefined);
    });

    it('should pass status filter to repository', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      await service.findAll(1, 1, 20, 1);
      expect(repository.findAll).toHaveBeenCalledWith(1, 1, 20, 1);
    });
  });

  describe('findById', () => {
    it('should return a team when found', async () => {
      repository.findById.mockResolvedValue(mockTeam);
      const result = await service.findById(1, 1);
      expect(result).toEqual(mockTeam);
      expect(repository.findById).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when team not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a new team', async () => {
      const dto = {
        name: 'Engineering',
        description: 'Engineering team',
      } as any;
      repository.create.mockResolvedValue(mockTeam);
      const result = await service.create(1, dto);
      expect(result).toEqual(mockTeam);
      expect(repository.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('update', () => {
    it('should update and return the team', async () => {
      const dto = { name: 'Updated Team' } as any;
      const updatedTeam = { ...mockTeam, name: 'Updated Team' };
      repository.update.mockResolvedValue(updatedTeam);
      const result = await service.update(1, 1, dto);
      expect(result).toEqual(updatedTeam);
      expect(repository.update).toHaveBeenCalledWith(1, 1, dto);
    });

    it('should throw NotFoundException when updating non-existent team', async () => {
      repository.update.mockResolvedValue(null);
      await expect(service.update(999, 1, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete the team', async () => {
      repository.delete.mockResolvedValue(mockTeam);
      const result = await service.delete(1, 1);
      expect(result).toEqual(mockTeam);
      expect(repository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('should throw NotFoundException when deleting non-existent team', async () => {
      repository.delete.mockResolvedValue(null);
      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findMembers', () => {
    it('should return members of a team', async () => {
      const mockMembers = [{ id: 1, teamId: 1, userId: 10 }];
      repository.findMembers.mockResolvedValue(mockMembers);
      const result = await service.findMembers(1, 1);
      expect(result).toEqual(mockMembers);
    });

    it('should throw NotFoundException when team not found', async () => {
      repository.findMembers.mockResolvedValue(null);
      await expect(service.findMembers(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addMember', () => {
    it('should add a member to a team', async () => {
      const mockMember = {
        id: 1,
        teamId: 1,
        userId: 10,
        roleInTeam: 'developer',
      };
      repository.addMember.mockResolvedValue(mockMember);
      const result = await service.addMember(1, 1, {
        userId: 10,
        roleInTeam: 'developer',
      });
      expect(result).toEqual(mockMember);
    });

    it('should throw NotFoundException when team not found for addMember', async () => {
      repository.addMember.mockResolvedValue(null);
      await expect(service.addMember(999, 1, { userId: 10 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
