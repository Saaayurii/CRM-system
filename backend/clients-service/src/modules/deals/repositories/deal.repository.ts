import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { OutboxService, OutboxEvent } from '../../../common/outbox/outbox.service';

@Injectable()
export class DealRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async findAll(
    accountId: number,
    status?: string,
    managerId?: number,
    clientId?: number,
  ) {
    const where: any = { accountId };
    if (status) where.status = status;
    if (managerId) where.assignedManagerId = managerId;
    if (clientId) where.clientId = clientId;
    return (this.prisma as any).deal.findMany({
      where,
      orderBy: [{ stageId: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { client: { select: { id: true, firstName: true, lastName: true, companyName: true } } },
    });
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).deal.findFirst({
      where: { id, accountId },
      include: { client: true, stage: true },
    });
  }

  async create(accountId: number, data: any) {
    return (this.prisma as any).deal.create({ data: { ...data, accountId } });
  }

  async update(id: number, accountId: number, data: any, outboxEvent?: OutboxEvent) {
    // The deal write and the domain event commit together (transactional outbox).
    await this.prisma.$transaction(async (tx: any) => {
      await tx.deal.updateMany({ where: { id, accountId }, data });
      if (outboxEvent) await this.outbox.emitWith(tx, outboxEvent);
    });
    return (this.prisma as any).deal.findFirst({ where: { id, accountId } });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).deal.deleteMany({ where: { id, accountId } });
  }

  // Сводка по стадиям: сумма и кол-во открытых сделок
  async statsByStage(accountId: number) {
    return (this.prisma as any).deal.groupBy({
      by: ['stageId'],
      where: { accountId, status: 'open' },
      _count: { _all: true },
      _sum: { amount: true },
    });
  }
}
