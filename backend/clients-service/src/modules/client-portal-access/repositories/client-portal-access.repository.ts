import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

export interface ClientPortalAccessCreateInput {
  clientId: number;
  projectId: number;
  accessToken?: string;
  login?: string;
  passwordHash?: string;
  userId?: number;
  canViewProgress?: boolean;
  canViewPhotos?: boolean;
  canViewDocuments?: boolean;
  canViewFinancials?: boolean;
  isActive?: boolean;
  expiresAt?: string | Date | null;
}

const ALLOWED_UPDATE_FIELDS = [
  'accessToken',
  'login',
  'passwordHash',
  'userId',
  'canViewProgress',
  'canViewPhotos',
  'canViewDocuments',
  'canViewFinancials',
  'isActive',
  'expiresAt',
  'projectId',
] as const;

@Injectable()
export class ClientPortalAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 20, clientId?: number) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (clientId) where.clientId = clientId;
    const [data, total] = await Promise.all([
      (this.prisma as any).clientPortalAccess.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).clientPortalAccess.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number) {
    return (this.prisma as any).clientPortalAccess.findUnique({
      where: { id },
    });
  }

  async create(input: ClientPortalAccessCreateInput) {
    return (this.prisma as any).clientPortalAccess.create({
      data: {
        clientId: input.clientId,
        projectId: input.projectId,
        accessToken: input.accessToken,
        login: input.login,
        passwordHash: input.passwordHash,
        userId: input.userId,
        canViewProgress: input.canViewProgress,
        canViewPhotos: input.canViewPhotos,
        canViewDocuments: input.canViewDocuments,
        canViewFinancials: input.canViewFinancials,
        isActive: input.isActive,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });
  }

  async update(id: number, patch: Record<string, any>) {
    const data: Record<string, any> = {};
    for (const key of ALLOWED_UPDATE_FIELDS) {
      if (patch[key] !== undefined) data[key] = patch[key];
    }
    if (data.expiresAt) data.expiresAt = new Date(data.expiresAt);
    return (this.prisma as any).clientPortalAccess.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return (this.prisma as any).clientPortalAccess.delete({ where: { id } });
  }
}
