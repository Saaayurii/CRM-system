import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TeamMembersService } from '../team-members.service';
import { TeamMemberRepository } from '../repositories/team-member.repository';

describe('TeamMembersService', () => {
  let service: TeamMembersService;
  let repository: jest.Mocked<TeamMemberRepository>;

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
      providers: [
        TeamMembersService,
        {
          provide: TeamMemberRepository,
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

    service = module.get<TeamMembersService>(TeamMembersService);
    repository = module.get(TeamMemberRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated team members', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await service.findAll(1, 20);
      expect(result).toEqual(mockPaginatedResult);
      expect(repository.findAll).toHaveBeenCalledWith(
        1,
        20,
        undefined,
        undefined,
      );
    });

    it('should pass teamId and userId filters', async () => {
      repository.findAll.mockResolvedValue(mockPaginatedResult);
      await service.findAll(1, 20, 1, 10);
      expect(repository.findAll).toHaveBeenCalledWith(1, 20, 1, 10);
    });
  });

  describe('findById', () => {
    it('should return a team member when found', async () => {
      repository.findById.mockResolvedValue(mockMember);
      const result = await service.findById(1);
      expect(result).toEqual(mockMember);
      expect(repository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when member not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a new team member', async () => {
      const dto = { teamId: 1, userId: 10, roleInTeam: 'developer' } as any;
      repository.create.mockResolvedValue(mockMember);
      const result = await service.create(dto);
      expect(result).toEqual(mockMember);
      expect(repository.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should update and return the team member', async () => {
      const dto = { roleInTeam: 'lead' } as any;
      const updatedMember = { ...mockMember, roleInTeam: 'lead' };
      repository.update.mockResolvedValue(updatedMember);
      const result = await service.update(1, dto);
      expect(result).toEqual(updatedMember);
      expect(repository.update).toHaveBeenCalledWith(1, dto);
    });

    it('should throw NotFoundException when updating non-existent member', async () => {
      repository.update.mockResolvedValue(null);
      await expect(service.update(999, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete the team member', async () => {
      repository.delete.mockResolvedValue(mockMember);
      const result = await service.delete(1);
      expect(result).toEqual(mockMember);
      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when deleting non-existent member', async () => {
      repository.delete.mockResolvedValue(null);
      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });
});
