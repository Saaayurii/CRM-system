import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class DefectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    accountId: number,
    page: number,
    limit: number,
    status?: number,
    projectId?: number,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { accountId };
    if (status !== undefined) where.status = status;
    if (projectId !== undefined) where.projectId = projectId;

    const [data, total] = await Promise.all([
      (this.prisma as any).defect.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).defect.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).defect.findFirst({
      where: { id, accountId },
      include: { inspection: true },
    });
  }

  async create(data: any) {
    return (this.prisma as any).defect.create({ data });
  }

  async update(id: number, accountId: number, data: any) {
    return (this.prisma as any).defect.updateMany({
      where: { id, accountId },
      data,
    });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).defect.deleteMany({
      where: { id, accountId },
    });
  }

  // Defect Templates
  async findAllTemplates(accountId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = { accountId };

    const [data, total] = await Promise.all([
      (this.prisma as any).defectTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).defectTemplate.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findTemplateById(id: number, accountId: number) {
    return (this.prisma as any).defectTemplate.findFirst({
      where: { id, accountId },
    });
  }

  async createTemplate(data: any) {
    return (this.prisma as any).defectTemplate.create({ data });
  }

  async updateTemplate(id: number, accountId: number, data: any) {
    return (this.prisma as any).defectTemplate.updateMany({
      where: { id, accountId },
      data,
    });
  }

  async deleteTemplate(id: number, accountId: number) {
    return (this.prisma as any).defectTemplate.deleteMany({
      where: { id, accountId },
    });
  }
}
