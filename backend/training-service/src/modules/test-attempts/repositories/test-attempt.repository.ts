import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class TestAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}
  async findAll(page: number = 1, limit: number = 20, knowledgeTestId?: number, userId?: number) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (knowledgeTestId) where.knowledgeTestId = knowledgeTestId;
    if (userId) where.userId = userId;
    const [data, total] = await Promise.all([
      (this.prisma as any).testAttempt.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      (this.prisma as any).testAttempt.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
  async findById(id: number) { return (this.prisma as any).testAttempt.findUnique({ where: { id } }); }
  async create(dto: any) { return (this.prisma as any).testAttempt.create({ data: dto }); }
}
