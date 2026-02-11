import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ConstructionSiteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    projectId?: number,
    page: number = 1,
    limit: number = 20,
    status?: number,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (projectId !== undefined) where.projectId = projectId;
    if (status !== undefined) where.status = status;

    const [data, total] = await Promise.all([
      (this.prisma as any).constructionSite.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).constructionSite.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number) {
    return (this.prisma as any).constructionSite.findFirst({
      where: { id },
      include: { project: true },
    });
  }

  async create(data: any) {
    return (this.prisma as any).constructionSite.create({ data });
  }

  async update(id: number, data: any) {
    return (this.prisma as any).constructionSite.updateMany({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return (this.prisma as any).constructionSite.deleteMany({
      where: { id },
    });
  }
}
