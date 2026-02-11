import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateClientPortalAccessDto } from '../dto/create-client-portal-access.dto';
import { UpdateClientPortalAccessDto } from '../dto/update-client-portal-access.dto';

@Injectable()
export class ClientPortalAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 20, clientId?: number) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (clientId) where.clientId = clientId;
    const [data, total] = await Promise.all([
      (this.prisma as any).clientPortalAccess.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      (this.prisma as any).clientPortalAccess.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number) {
    return (this.prisma as any).clientPortalAccess.findUnique({ where: { id } });
  }

  async create(dto: CreateClientPortalAccessDto) {
    return (this.prisma as any).clientPortalAccess.create({
      data: { ...dto, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null },
    });
  }

  async update(id: number, dto: UpdateClientPortalAccessDto) {
    const data: any = { ...dto };
    if (dto.expiresAt) data.expiresAt = new Date(dto.expiresAt);
    return (this.prisma as any).clientPortalAccess.update({ where: { id }, data });
  }

  async delete(id: number) {
    return (this.prisma as any).clientPortalAccess.delete({ where: { id } });
  }
}
