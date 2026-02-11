import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateTrainingMaterialDto } from '../dto/create-training-material.dto';
import { UpdateTrainingMaterialDto } from '../dto/update-training-material.dto';

@Injectable()
export class TrainingMaterialRepository {
  constructor(private readonly prisma: PrismaService) {}
  async findAll(accountId: number, page: number = 1, limit: number = 20, category?: string) {
    const skip = (page - 1) * limit;
    const where: any = { accountId };
    if (category) where.category = category;
    const [data, total] = await Promise.all([
      (this.prisma as any).trainingMaterial.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      (this.prisma as any).trainingMaterial.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
  async findById(id: number, accountId: number) { return (this.prisma as any).trainingMaterial.findFirst({ where: { id, accountId } }); }
  async create(accountId: number, dto: CreateTrainingMaterialDto) { return (this.prisma as any).trainingMaterial.create({ data: { ...dto, accountId } }); }
  async update(id: number, accountId: number, dto: UpdateTrainingMaterialDto) { await (this.prisma as any).trainingMaterial.updateMany({ where: { id, accountId }, data: { ...dto } }); return (this.prisma as any).trainingMaterial.findFirst({ where: { id, accountId } }); }
  async delete(id: number, accountId: number) { return (this.prisma as any).trainingMaterial.deleteMany({ where: { id, accountId } }); }
}
