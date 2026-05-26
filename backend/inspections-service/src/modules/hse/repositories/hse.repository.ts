import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

type HseModel =
  | 'hseRisk'
  | 'hseIncident'
  | 'hsePermit'
  | 'hseViolation'
  | 'hseCorrectiveAction'
  | 'hseMonitoring';

@Injectable()
export class HseRepository {
  constructor(private readonly prisma: PrismaService) {}

  private model(name: HseModel) {
    return (this.prisma as any)[name];
  }

  async findAll(
    name: HseModel,
    accountId: number,
    filters: {
      page: number;
      limit: number;
      status?: string;
      projectId?: number;
      includeDeleted?: boolean;
      where?: any;
      orderBy?: any;
    },
  ) {
    const skip = (filters.page - 1) * filters.limit;
    const where: any = {
      accountId,
      ...(name === 'hseMonitoring' ? {} : { deletedAt: null }),
      ...(filters.where ?? {}),
    };
    if (filters.status) where.status = filters.status;
    if (filters.projectId !== undefined) where.projectId = filters.projectId;

    const [data, total] = await Promise.all([
      this.model(name).findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: filters.orderBy ?? { createdAt: 'desc' },
      }),
      this.model(name).count({ where }),
    ]);
    return {
      data,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
    };
  }

  async findById(name: HseModel, id: number, accountId: number) {
    return this.model(name).findFirst({
      where: {
        id,
        accountId,
        ...(name === 'hseMonitoring' ? {} : { deletedAt: null }),
      },
    });
  }

  async create(name: HseModel, accountId: number, data: any) {
    return this.model(name).create({
      data: { ...data, accountId },
    });
  }

  async update(name: HseModel, id: number, accountId: number, data: any) {
    await this.model(name).updateMany({
      where: {
        id,
        accountId,
        ...(name === 'hseMonitoring' ? {} : { deletedAt: null }),
      },
      data,
    });
    return this.findById(name, id, accountId);
  }

  async softDelete(name: HseModel, id: number, accountId: number) {
    if (name === 'hseMonitoring') {
      return this.model(name).deleteMany({ where: { id, accountId } });
    }
    return this.model(name).updateMany({
      where: { id, accountId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  // Aggregated dashboard
  async dashboardSummary(accountId: number) {
    const [
      openRisks,
      newIncidents,
      activePermits,
      openViolations,
      overdueActions,
      criticalMonitoring,
      lastIncidents,
      lastViolations,
    ] = await Promise.all([
      this.model('hseRisk').count({
        where: { accountId, deletedAt: null, status: { in: ['identified', 'mitigated'] } },
      }),
      this.model('hseIncident').count({
        where: { accountId, deletedAt: null, investigationStatus: { in: ['new', 'investigating'] } },
      }),
      this.model('hsePermit').count({
        where: { accountId, deletedAt: null, status: { in: ['approved', 'active'] } },
      }),
      this.model('hseViolation').count({
        where: { accountId, deletedAt: null, status: { in: ['open', 'acknowledged'] } },
      }),
      this.model('hseCorrectiveAction').count({
        where: {
          accountId,
          deletedAt: null,
          status: { in: ['open', 'in_progress'] },
          dueDate: { lt: new Date() },
        },
      }),
      this.model('hseMonitoring').count({
        where: { accountId, status: 'critical' },
      }),
      this.model('hseIncident').findMany({
        where: { accountId, deletedAt: null },
        orderBy: { occurredAt: 'desc' },
        take: 5,
      }),
      this.model('hseViolation').findMany({
        where: { accountId, deletedAt: null },
        orderBy: { observedAt: 'desc' },
        take: 5,
      }),
    ]);
    return {
      counters: {
        openRisks,
        newIncidents,
        activePermits,
        openViolations,
        overdueActions,
        criticalMonitoring,
      },
      lastIncidents,
      lastViolations,
    };
  }
}
