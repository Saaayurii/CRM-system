import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateAutomationRuleDto } from '../dto/create-automation-rule.dto';
import { UpdateAutomationRuleDto } from '../dto/update-automation-rule.dto';

@Injectable()
export class AutomationRuleRepository {
  constructor(private readonly prisma: PrismaService) {}
  async findAll(accountId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      (this.prisma as any).automationRule.findMany({
        where: { accountId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).automationRule.count({ where: { accountId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
  async findById(id: number, accountId: number) {
    return (this.prisma as any).automationRule.findFirst({
      where: { id, accountId },
    });
  }
  async create(
    accountId: number,
    userId: number,
    dto: CreateAutomationRuleDto,
  ) {
    return (this.prisma as any).automationRule.create({
      data: { ...dto, accountId, createdByUserId: userId },
    });
  }
  async update(id: number, accountId: number, dto: UpdateAutomationRuleDto) {
    await (this.prisma as any).automationRule.updateMany({
      where: { id, accountId },
      data: { ...dto },
    });
    return (this.prisma as any).automationRule.findFirst({
      where: { id, accountId },
    });
  }
  async delete(id: number, accountId: number) {
    return (this.prisma as any).automationRule.deleteMany({
      where: { id, accountId },
    });
  }

  /** Active rules for an account — used by the engine to match incoming events. */
  async findActiveByAccount(accountId: number) {
    return (this.prisma as any).automationRule.findMany({
      where: { accountId, isActive: true },
    });
  }

  /** Bump execution counters after a rule fires. */
  async recordExecution(id: number) {
    return (this.prisma as any).automationRule.update({
      where: { id },
      data: { executionCount: { increment: 1 }, lastExecutedAt: new Date() },
    });
  }
}
