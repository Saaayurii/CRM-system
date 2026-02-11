import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class KnowledgeTestRepository {
  constructor(private readonly prisma: PrismaService) {}
  async findAll(accountId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      (this.prisma as any).knowledgeTest.findMany({
        where: { accountId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).knowledgeTest.count({ where: { accountId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
  async findById(id: number, accountId: number) {
    return (this.prisma as any).knowledgeTest.findFirst({
      where: { id, accountId },
    });
  }
  async create(accountId: number, dto: any) {
    return (this.prisma as any).knowledgeTest.create({
      data: { ...dto, accountId },
    });
  }
  async update(id: number, accountId: number, dto: any) {
    await (this.prisma as any).knowledgeTest.updateMany({
      where: { id, accountId },
      data: dto,
    });
    return (this.prisma as any).knowledgeTest.findFirst({
      where: { id, accountId },
    });
  }
  async delete(id: number, accountId: number) {
    return (this.prisma as any).knowledgeTest.deleteMany({
      where: { id, accountId },
    });
  }
}
