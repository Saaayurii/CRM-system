import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class UserAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number = 1,
    limit: number = 20,
    projectId?: number,
    userId?: number,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (projectId !== undefined) where.projectId = projectId;
    if (userId !== undefined) where.userId = userId;

    const [data, total] = await Promise.all([
      (this.prisma as any).userProjectAssignment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).userProjectAssignment.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number) {
    return (this.prisma as any).userProjectAssignment.findFirst({
      where: { id },
      include: { project: true },
    });
  }

  async create(data: any) {
    return (this.prisma as any).userProjectAssignment.create({ data });
  }

  async update(id: number, data: any) {
    return (this.prisma as any).userProjectAssignment.updateMany({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return (this.prisma as any).userProjectAssignment.deleteMany({
      where: { id },
    });
  }
}
