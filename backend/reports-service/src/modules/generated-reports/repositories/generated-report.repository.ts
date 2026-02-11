import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateGeneratedReportDto } from '../dto/create-generated-report.dto';
import { UpdateGeneratedReportDto } from '../dto/update-generated-report.dto';

@Injectable()
export class GeneratedReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    accountId: number,
    page: number = 1,
    limit: number = 20,
    filters?: { projectId?: number; reportTemplateId?: number },
  ) {
    const skip = (page - 1) * limit;
    const where: any = { accountId };

    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }
    if (filters?.reportTemplateId) {
      where.reportTemplateId = filters.reportTemplateId;
    }

    const [data, total] = await Promise.all([
      (this.prisma as any).generatedReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).generatedReport.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).generatedReport.findFirst({
      where: { id, accountId },
    });
  }

  async create(accountId: number, dto: CreateGeneratedReportDto) {
    const data: any = { ...dto, accountId };
    if (dto.periodStart) {
      data.periodStart = new Date(dto.periodStart);
    }
    if (dto.periodEnd) {
      data.periodEnd = new Date(dto.periodEnd);
    }
    return (this.prisma as any).generatedReport.create({ data });
  }

  async update(id: number, accountId: number, dto: UpdateGeneratedReportDto) {
    const data: any = { ...dto };
    if (dto.periodStart) {
      data.periodStart = new Date(dto.periodStart);
    }
    if (dto.periodEnd) {
      data.periodEnd = new Date(dto.periodEnd);
    }
    return (this.prisma as any).generatedReport
      .updateMany({
        where: { id, accountId },
        data,
      })
      .then(async () => {
        return (this.prisma as any).generatedReport.findFirst({
          where: { id, accountId },
        });
      });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).generatedReport.deleteMany({
      where: { id, accountId },
    });
  }
}
