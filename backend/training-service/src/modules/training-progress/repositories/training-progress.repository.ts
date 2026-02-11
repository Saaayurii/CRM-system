import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class TrainingProgressRepository {
  constructor(private readonly prisma: PrismaService) {}
  async findAll(page: number = 1, limit: number = 20, userId?: number, trainingMaterialId?: number) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (userId) where.userId = userId;
    if (trainingMaterialId) where.trainingMaterialId = trainingMaterialId;
    const [data, total] = await Promise.all([
      (this.prisma as any).trainingProgress.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      (this.prisma as any).trainingProgress.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
  async findById(id: number) { return (this.prisma as any).trainingProgress.findUnique({ where: { id } }); }
  async create(dto: any) { return (this.prisma as any).trainingProgress.create({ data: dto }); }
  async update(id: number, dto: any) { return (this.prisma as any).trainingProgress.update({ where: { id }, data: dto }); }
}
