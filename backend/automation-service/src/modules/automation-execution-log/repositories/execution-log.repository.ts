import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateExecutionLogDto } from '../dto/create-execution-log.dto';

@Injectable()
export class ExecutionLogRepository {
  constructor(private readonly prisma: PrismaService) {}
  async findAll(
    page: number = 1,
    limit: number = 20,
    automationRuleId?: number,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (automationRuleId) where.automationRuleId = automationRuleId;
    const [data, total] = await Promise.all([
      (this.prisma as any).automationExecutionLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { executedAt: 'desc' },
      }),
      (this.prisma as any).automationExecutionLog.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
  async findById(id: number) {
    return (this.prisma as any).automationExecutionLog.findUnique({
      where: { id },
    });
  }
  async create(dto: CreateExecutionLogDto) {
    return (this.prisma as any).automationExecutionLog.create({
      data: { ...dto },
    });
  }
}
