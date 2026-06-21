import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ControlPointRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    accountId: number,
    page: number,
    limit: number,
    status?: string,
    section?: string,
    q?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { accountId };
    if (status) where.status = status;
    if (section) where.section = section;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      (this.prisma as any).controlPoint.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      (this.prisma as any).controlPoint.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).controlPoint.findFirst({ where: { id, accountId } });
  }

  async create(data: any) {
    return (this.prisma as any).controlPoint.create({ data });
  }

  async update(id: number, accountId: number, data: any) {
    return (this.prisma as any).controlPoint.updateMany({ where: { id, accountId }, data });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).controlPoint.deleteMany({ where: { id, accountId } });
  }
}
