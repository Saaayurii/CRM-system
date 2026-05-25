import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ClientPortalAccessService } from '../client-portal-access.service';
import { ClientPortalAccessRepository } from '../repositories/client-portal-access.repository';
import { PrismaService } from '../../../database/prisma.service';

describe('ClientPortalAccessService', () => {
  let service: ClientPortalAccessService;
  let repository: jest.Mocked<ClientPortalAccessRepository>;
  let prisma: any;

  const mockAccess = {
    id: 1,
    clientId: 1,
    projectId: 7,
    isActive: true,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginated = {
    data: [mockAccess],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    prisma = {
      client: { findUnique: jest.fn() },
      user: { create: jest.fn() },
      project: { findUnique: jest.fn() },
      clientPortalAccess: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientPortalAccessService,
        {
          provide: ClientPortalAccessRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: HttpService, useValue: { post: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<ClientPortalAccessService>(ClientPortalAccessService);
    repository = module.get(ClientPortalAccessRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated portal access records', async () => {
      repository.findAll.mockResolvedValue(mockPaginated);

      const result = await service.findAll(1, 20);

      expect(result).toEqual(mockPaginated);
      expect(repository.findAll).toHaveBeenCalledWith(1, 20, undefined);
    });

    it('should pass clientId filter when provided', async () => {
      repository.findAll.mockResolvedValue(mockPaginated);

      await service.findAll(1, 20, 3);

      expect(repository.findAll).toHaveBeenCalledWith(1, 20, 3);
    });
  });

  describe('findById', () => {
    it('should return a portal access record when found', async () => {
      repository.findById.mockResolvedValue(mockAccess);

      const result = await service.findById(1);

      expect(result).toEqual(mockAccess);
      expect(repository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when record is not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should generate access token and create access record without password', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 1, accountId: 5, companyName: 'ACME' });
      repository.create.mockResolvedValue(mockAccess);

      const result = await service.create({ clientId: 1, projectId: 7, createChat: false } as any);

      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 1,
          projectId: 7,
          accessToken: expect.any(String),
        }),
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should create user when login and password are provided', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 1, accountId: 5, companyName: 'ACME' });
      prisma.clientPortalAccess.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 42 });
      repository.create.mockResolvedValue(mockAccess);

      await service.create({
        clientId: 1,
        projectId: 7,
        login: 'client@acme.com',
        password: 'secret-pw-12345',
        createChat: false,
      } as any);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accountId: 5,
            roleId: 15,
            email: 'client@acme.com',
          }),
        }),
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 42, login: 'client@acme.com' }),
      );
    });
  });

  describe('update', () => {
    it('should update an existing portal access record', async () => {
      const dto = { isActive: false } as any;
      repository.findById.mockResolvedValue(mockAccess);
      repository.update.mockResolvedValue({ ...mockAccess, isActive: false });

      const result = await service.update(1, dto);

      expect(result.isActive).toBe(false);
      expect(repository.update).toHaveBeenCalledWith(1, expect.objectContaining({ isActive: false }));
    });

    it('should throw NotFoundException when updating non-existent record', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(999, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete an existing portal access record', async () => {
      repository.findById.mockResolvedValue(mockAccess);
      repository.delete.mockResolvedValue(mockAccess);

      await service.delete(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when deleting non-existent record', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });
});
