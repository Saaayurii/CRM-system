import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  const mockUser = { id: 1, email: 'test@test.com', roleId: 1, accountId: 1 };

  const mockUserResponse = {
    id: 1,
    name: 'John Doe',
    email: 'john@test.com',
    phone: '+7 999 123 4567',
    position: 'Project Manager',
    accountId: 1,
    roleId: 1,
    role: { code: 'admin', name: 'Administrator' },
    isActive: true,
    availability: 1,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            findByRole: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll with correct parameters', async () => {
      const mockResult = {
        users: [mockUserResponse],
        total: 1,
        page: 1,
        limit: 20,
      };
      service.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockUser, 1, 20);

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20);
    });

    it('should use default values when page and limit are not provided', async () => {
      const mockResult = { users: [], total: 0, page: 1, limit: 20 };
      service.findAll.mockResolvedValue(mockResult);

      await controller.findAll(mockUser);

      expect(service.findAll).toHaveBeenCalledWith(1, 1, 20);
    });
  });

  describe('findByRole', () => {
    it('should call service.findByRole with accountId and roleId', async () => {
      service.findByRole.mockResolvedValue([mockUserResponse]);

      const result = await controller.findByRole(mockUser, 1);

      expect(result).toEqual([mockUserResponse]);
      expect(service.findByRole).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('findOne', () => {
    it('should call service.findById with id and accountId', async () => {
      service.findById.mockResolvedValue(mockUserResponse);

      const result = await controller.findOne(mockUser, 1);

      expect(result).toEqual(mockUserResponse);
      expect(service.findById).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('create', () => {
    it('should call service.create with dto and accountId', async () => {
      const createDto = {
        accountId: 1,
        name: 'New User',
        email: 'new@test.com',
        roleId: 1,
      };
      service.create.mockResolvedValue(mockUserResponse);

      const result = await controller.create(mockUser, createDto);

      expect(result).toEqual(mockUserResponse);
      expect(service.create).toHaveBeenCalledWith(createDto, 1);
    });
  });

  describe('update', () => {
    it('should call service.update with id, dto and accountId', async () => {
      const updateDto = { name: 'Updated Name' };
      service.update.mockResolvedValue({
        ...mockUserResponse,
        name: 'Updated Name',
      });

      const result = await controller.update(mockUser, 1, updateDto);

      expect(result.name).toBe('Updated Name');
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
});
