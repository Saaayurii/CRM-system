import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class SitePlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    accountId: number,
    projectId?: number,
    constructionSiteId?: number,
  ) {
    const where: any = { accountId, deletedAt: null };
    if (projectId !== undefined) where.projectId = projectId;
    if (constructionSiteId !== undefined)
      where.constructionSiteId = constructionSiteId;

    return (this.prisma as any).sitePlan.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { _count: { select: { defects: true } } },
    });
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).sitePlan.findFirst({
      where: { id, accountId, deletedAt: null },
    });
  }

  // План + все его дефекты-пины (для просмотрщика)
  async findWithDefects(id: number, accountId: number) {
    return (this.prisma as any).sitePlan.findFirst({
      where: { id, accountId, deletedAt: null },
      include: {
        defects: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async create(data: any) {
    return (this.prisma as any).sitePlan.create({ data });
  }

  async update(id: number, accountId: number, data: any) {
    return (this.prisma as any).sitePlan.updateMany({
      where: { id, accountId, deletedAt: null },
      data,
    });
  }

  async softDelete(id: number, accountId: number) {
    return (this.prisma as any).sitePlan.updateMany({
      where: { id, accountId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
