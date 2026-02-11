import { Test, TestingModule } from '@nestjs/testing';
import { TeamsController } from '../teams.controller';
import { TeamsService } from '../teams.service';

describe('TeamsController', () => {
  let controller: TeamsController;
  let service: jest.Mocked<TeamsService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };

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
      controllers: [TeamsController],
      providers: [
        {
          provide: TeamsService,
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

    controller = module.get<TeamsController>(TeamsController);
    service = module.get(TeamsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should delegate to service.findAll', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await controller.findAll(mockUser);
      expect(result).toEqual(mockPaginatedResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20, undefined);
    });

    it('should pass status filter', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResult);
      await controller.findAll(mockUser, '1', '1', '20');
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20, 1);
    });
  });

  describe('findById', () => {
    it('should delegate to service.findById', async () => {
      service.findById.mockResolvedValue(mockTeam);
      const result = await controller.findById(1, mockUser);
      expect(result).toEqual(mockTeam);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should delegate to service.create', async () => {
      const dto = { name: 'Engineering' } as any;
      service.create.mockResolvedValue(mockTeam);
      const result = await controller.create(dto, mockUser);
      expect(result).toEqual(mockTeam);
      expect(service.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('update', () => {
    it('should delegate to service.update', async () => {
      const dto = { name: 'Updated' } as any;
      service.update.mockResolvedValue({ ...mockTeam, name: 'Updated' });
      await controller.update(1, dto, mockUser);
      expect(service.update).toHaveBeenCalledWith(1, 1, dto);
    });
  });

  describe('delete', () => {
    it('should delegate to service.delete', async () => {
      service.delete.mockResolvedValue(mockTeam);
      await controller.delete(1, mockUser);
      expect(service.delete).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('findMembers', () => {
    it('should delegate to service.findMembers', async () => {
      const mockMembers = [{ id: 1, teamId: 1, userId: 10 }];
      service.findMembers.mockResolvedValue(mockMembers);
      const result = await controller.findMembers(1, mockUser);
      expect(result).toEqual(mockMembers);
      expect(service.findMembers).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('addMember', () => {
    it('should delegate to service.addMember', async () => {
      const body = { userId: 10, roleInTeam: 'developer' };
      const mockMember = { id: 1, teamId: 1, ...body };
      service.addMember.mockResolvedValue(mockMember);
      const result = await controller.addMember(1, body, mockUser);
      expect(result).toEqual(mockMember);
      expect(service.addMember).toHaveBeenCalledWith(1, 1, body);
    });
  });
});
