import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import { UserRepository } from '../repositories/user.repository';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UserRepository>;

  const mockUser = {
    id: 1,
    accountId: 1,
    name: 'John Doe',
    email: 'john@test.com',
    phone: '+7 999 123 4567',
    position: 'Project Manager',
    roleId: 1,
    role: { code: 'admin', name: 'Administrator' },
    isActive: true,
    availability: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UserRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            findByEmail: jest.fn(),
            findByAccountAndRole: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(UserRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      repository.findAll.mockResolvedValue([mockUser]);
      repository.count.mockResolvedValue(1);

      const result = await service.findAll(1, 1, 20);

      expect(result).toEqual({
        users: expect.any(Array),
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(result.users[0].id).toBe(1);
      expect(result.users[0].name).toBe('John Doe');
      expect(repository.findAll).toHaveBeenCalledWith(1, { skip: 0, take: 20 });
      expect(repository.count).toHaveBeenCalledWith(1);
    });

    it('should calculate correct skip value for pagination', async () => {
      repository.findAll.mockResolvedValue([]);
      repository.count.mockResolvedValue(0);

      await service.findAll(1, 3, 10);

      expect(repository.findAll).toHaveBeenCalledWith(1, { skip: 20, take: 10 });
    });
  });

  describe('findById', () => {
    it('should return a user response dto when found and account matches', async () => {
      repository.findById.mockResolvedValue(mockUser);

      const result = await service.findById(1, 1);

      expect(result.id).toBe(1);
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@test.com');
      expect(repository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId does not match', async () => {
      repository.findById.mockResolvedValue(mockUser);

      await expect(service.findById(1, 999)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByRole', () => {
    it('should return users filtered by role', async () => {
      repository.findByAccountAndRole.mockResolvedValue([mockUser]);

      const result = await service.findByRole(1, 1);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(repository.findByAccountAndRole).toHaveBeenCalledWith(1, 1);
    });

    it('should return empty array when no users found for role', async () => {
      repository.findByAccountAndRole.mockResolvedValue([]);

      const result = await service.findByRole(1, 99);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    const createDto = {
      accountId: 1,
      name: 'New User',
      email: 'new@test.com',
      roleId: 1,
    };

    it('should create and return a user', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockResolvedValue({ ...mockUser, ...createDto });

      const result = await service.create(createDto, 1);

      expect(result).toBeDefined();
      expect(result.name).toBe('New User');
      expect(repository.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw ForbiddenException when accountId does not match requesting user', async () => {
      await expect(service.create(createDto, 999)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when email already exists', async () => {
      repository.findByEmail.mockResolvedValue(mockUser);

      await expect(service.create(createDto, 1)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const updateDto = { name: 'Updated Name' };

    it('should update and return the user', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.update.mockResolvedValue({ ...mockUser, name: 'Updated Name' });

      const result = await service.update(1, updateDto, 1);

      expect(result.name).toBe('Updated Name');
      expect(repository.update).toHaveBeenCalledWith(1, updateDto);
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(999, updateDto, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId does not match', async () => {
      repository.findById.mockResolvedValue(mockUser);

      await expect(service.update(1, updateDto, 999)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should soft delete the user', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.softDelete.mockResolvedValue(undefined);

      await service.remove(1, 1);

      expect(repository.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accountId does not match', async () => {
      repository.findById.mockResolvedValue(mockUser);

      await expect(service.remove(1, 999)).rejects.toThrow(ForbiddenException);
    });
  });
});
