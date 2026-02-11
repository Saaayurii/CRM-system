import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class EquipmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    accountId: number,
    page: number,
    limit: number,
    status?: number,
    siteId?: number,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { accountId };
    if (status !== undefined) where.status = status;
    if (siteId !== undefined) where.constructionSiteId = siteId;

    const [data, total] = await Promise.all([
      (this.prisma as any).equipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).equipment.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).equipment.findFirst({
      where: { id, accountId },
      include: { maintenanceRecords: true },
    });
  }

  async create(data: any) {
    return (this.prisma as any).equipment.create({ data });
  }

  async update(id: number, accountId: number, data: any) {
    return (this.prisma as any).equipment.updateMany({
      where: { id, accountId },
      data,
    });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).equipment.deleteMany({
      where: { id, accountId },
    });
  }
}
