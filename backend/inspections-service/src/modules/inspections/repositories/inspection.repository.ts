import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class InspectionRepository {
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
      (this.prisma as any).inspection.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).inspection.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).inspection.findFirst({
      where: { id, accountId },
      include: { checklistResults: true, defects: true },
    });
  }

  async create(data: any) {
    return (this.prisma as any).inspection.create({ data });
  }

  async update(id: number, accountId: number, data: any) {
    return (this.prisma as any).inspection.updateMany({
      where: { id, accountId },
      data,
    });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).inspection.deleteMany({
      where: { id, accountId },
    });
  }

  // Checklist Templates
  async findAllTemplates(accountId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = { accountId };

    const [data, total] = await Promise.all([
      (this.prisma as any).inspectionChecklistTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).inspectionChecklistTemplate.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findTemplateById(id: number, accountId: number) {
    return (this.prisma as any).inspectionChecklistTemplate.findFirst({
      where: { id, accountId },
    });
  }

  async createTemplate(data: any) {
    return (this.prisma as any).inspectionChecklistTemplate.create({ data });
  }

  async updateTemplate(id: number, accountId: number, data: any) {
    return (this.prisma as any).inspectionChecklistTemplate.updateMany({
      where: { id, accountId },
      data,
    });
  }

  async deleteTemplate(id: number, accountId: number) {
    return (this.prisma as any).inspectionChecklistTemplate.deleteMany({
      where: { id, accountId },
    });
  }
}
