import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateReportTemplateDto } from '../dto/create-report-template.dto';
import { UpdateReportTemplateDto } from '../dto/update-report-template.dto';

@Injectable()
export class ReportTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    accountId: number,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { accountId };

    const [data, total] = await Promise.all([
      (this.prisma as any).reportTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).reportTemplate.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).reportTemplate.findFirst({
      where: { id, accountId },
    });
  }

  async create(accountId: number, dto: CreateReportTemplateDto) {
    const data: any = { ...dto, accountId };
    return (this.prisma as any).reportTemplate.create({ data });
  }

  async update(id: number, accountId: number, dto: UpdateReportTemplateDto) {
    const data: any = { ...dto };
    return (this.prisma as any).reportTemplate.updateMany({
      where: { id, accountId },
      data,
    }).then(async () => {
      return (this.prisma as any).reportTemplate.findFirst({ where: { id, accountId } });
    });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).reportTemplate.deleteMany({
      where: { id, accountId },
    });
  }
}
