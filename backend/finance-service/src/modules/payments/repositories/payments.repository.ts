import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { UpdatePaymentDto } from '../dto/update-payment.dto';

const DOC_TYPE_BY_SUBTYPE: Record<string, string> = {
  advance: 'А',
  payment: 'П',
  refund: 'В',
  bill: 'С',
  material: 'М',
  advance_disbursement: 'Д',
  payroll: 'Р',
};

export interface PaymentFilters {
  page?: number;
  limit?: number;
  projectId?: number;
  constructionSiteId?: number;
  direction?: 'income' | 'expense';
  subType?: string;
  paymentAccountId?: number;
  dateFrom?: string;
  dateTo?: string;
  allowedProjectIds?: number[];
}

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: number, filters: PaymentFilters = {}) {
    const {
      page = 1,
      limit = 20,
      projectId,
      constructionSiteId,
      direction,
      subType,
      paymentAccountId,
      dateFrom,
      dateTo,
      allowedProjectIds,
    } = filters;
    const skip = (page - 1) * limit;
    const where: any = { accountId };
    if (projectId) where.projectId = projectId;
    if (constructionSiteId) where.constructionSiteId = constructionSiteId;
    if (direction) where.direction = direction;
    if (subType) where.subType = subType;
    if (paymentAccountId) where.paymentAccountId = paymentAccountId;
    if (dateFrom || dateTo) {
      where.paymentDate = {};
      if (dateFrom) where.paymentDate.gte = new Date(dateFrom);
      if (dateTo) where.paymentDate.lte = new Date(dateTo);
    }
    if (allowedProjectIds) {
      where.projectId = allowedProjectIds.length > 0 ? { in: allowedProjectIds } : -1;
    }
    const [data, total] = await Promise.all([
      (this.prisma as any).payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ paymentDatetime: 'desc' }, { createdAt: 'desc' }],
        include: { paymentAccount: true },
      }),
      (this.prisma as any).payment.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).payment.findFirst({
      where: { id, accountId },
      include: { paymentAccount: true },
    });
  }

  async stats(accountId: number, filters: PaymentFilters = {}) {
    const where: any = { accountId };
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.constructionSiteId)
      where.constructionSiteId = filters.constructionSiteId;
    if (filters.dateFrom || filters.dateTo) {
      where.paymentDate = {};
      if (filters.dateFrom) where.paymentDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.paymentDate.lte = new Date(filters.dateTo);
    }
    const grouped = await (this.prisma as any).payment.groupBy({
      by: ['direction', 'subType'],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    });
    return grouped.map((g: any) => ({
      direction: g.direction,
      subType: g.subType,
      total: Number(g._sum.amount ?? 0),
      count: g._count._all,
    }));
  }

  async create(
    accountId: number,
    dto: CreatePaymentDto,
    createdByUserId: number,
  ) {
    const documentType =
      dto.documentType ??
      (dto.subType ? DOC_TYPE_BY_SUBTYPE[dto.subType] : undefined) ??
      (dto.direction === 'income' ? 'П' : 'С');

    const data: any = { ...dto, accountId, createdByUserId };

    if (!data.paymentNumber) {
      data.paymentNumber = await this.generateNumber(accountId, documentType);
    }
    data.documentType = documentType;

    const nowIso = new Date().toISOString();
    if (!data.paymentDatetime) data.paymentDatetime = nowIso;
    if (!data.paymentDate) data.paymentDate = new Date(data.paymentDatetime).toISOString().split('T')[0];
    if (data.paymentDate && !String(data.paymentDate).includes('T')) {
      data.paymentDate = new Date(data.paymentDate).toISOString();
    }

    if (!data.paymentType && data.direction) {
      data.paymentType = data.direction;
    }

    return (this.prisma as any).payment.create({ data });
  }

  async update(id: number, accountId: number, dto: UpdatePaymentDto) {
    const data: any = { ...dto };
    if (data.paymentDate && !String(data.paymentDate).includes('T')) {
      data.paymentDate = new Date(data.paymentDate).toISOString();
    }
    return (this.prisma as any).payment
      .updateMany({
        where: { id, accountId },
        data,
      })
      .then(async () => {
        return (this.prisma as any).payment.findFirst({
          where: { id, accountId },
        });
      });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).payment.deleteMany({
      where: { id, accountId },
    });
  }

  // Формат номера: ГОД-ПОРЯДКОВЫЙ-КОД (например 2026-001-П).
  // Порядковый номер сквозной по аккаунту, по году. Считаем по префиксу `<year>-`.
  private async generateNumber(
    accountId: number,
    documentType: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `${year}-`;
    const lastForYear = await (this.prisma as any).payment.findFirst({
      where: { accountId, paymentNumber: { startsWith: prefix } },
      orderBy: { id: 'desc' },
      select: { paymentNumber: true },
    });
    let next = 1;
    if (lastForYear?.paymentNumber) {
      const match = /^\d{4}-(\d+)/.exec(lastForYear.paymentNumber);
      if (match) next = Number(match[1]) + 1;
    }
    const seq = String(next).padStart(3, '0');
    return `${year}-${seq}-${documentType}`;
  }
}
