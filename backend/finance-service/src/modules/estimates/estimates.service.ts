import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateEstimateDto,
  UpdateEstimateDto,
  UpsertSectionDto,
  UpsertItemDto,
} from './dto/upsert-estimate.dto';

@Injectable()
export class EstimatesService {
  constructor(private readonly prisma: PrismaService) {}

  list(accountId: number, params: { projectId?: number; contractId?: number } = {}) {
    const where: Record<string, unknown> = { accountId, deletedAt: null };
    if (params.projectId) where.projectId = params.projectId;
    if (params.contractId) where.contractId = params.contractId;
    return (this.prisma as any).estimate.findMany({
      where,
      orderBy: { id: 'desc' },
      include: {
        sections: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          include: { items: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
        },
      },
    });
  }

  async get(accountId: number, id: number) {
    const row = await (this.prisma as any).estimate.findFirst({
      where: { id, accountId, deletedAt: null },
      include: {
        sections: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          include: { items: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
        },
      },
    });
    if (!row) throw new NotFoundException(`Estimate #${id} not found`);
    return row;
  }

  async create(accountId: number, dto: CreateEstimateDto) {
    return (this.prisma as any).estimate.create({
      data: { ...this.normalize(dto), accountId },
    });
  }

  async update(accountId: number, id: number, dto: UpdateEstimateDto) {
    await this.get(accountId, id);
    return (this.prisma as any).estimate.update({
      where: { id },
      data: this.normalize(dto),
    });
  }

  async remove(accountId: number, id: number) {
    await this.get(accountId, id);
    await (this.prisma as any).estimate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id };
  }

  /* ── Sections ── */

  async addSection(accountId: number, estimateId: number, dto: UpsertSectionDto) {
    await this.get(accountId, estimateId);
    return (this.prisma as any).estimateSection.create({
      data: { ...this.normalize(dto), estimateId },
    });
  }

  async updateSection(accountId: number, estimateId: number, sectionId: number, dto: UpsertSectionDto) {
    await this.ensureSectionOwned(accountId, estimateId, sectionId);
    return (this.prisma as any).estimateSection.update({
      where: { id: sectionId },
      data: this.normalize(dto),
    });
  }

  async deleteSection(accountId: number, estimateId: number, sectionId: number) {
    await this.ensureSectionOwned(accountId, estimateId, sectionId);
    await (this.prisma as any).estimateSection.delete({ where: { id: sectionId } });
    await this.recalcEstimateTotal(estimateId);
    return { id: sectionId };
  }

  /* ── Items ── */

  async addItem(accountId: number, estimateId: number, sectionId: number, dto: UpsertItemDto) {
    await this.ensureSectionOwned(accountId, estimateId, sectionId);
    const data = this.normalizeItem(dto);
    const item = await (this.prisma as any).estimateItem.create({
      data: { ...data, sectionId },
    });
    await this.recalcSectionTotal(sectionId);
    await this.recalcEstimateTotal(estimateId);
    return item;
  }

  async updateItem(
    accountId: number,
    estimateId: number,
    sectionId: number,
    itemId: number,
    dto: UpsertItemDto,
  ) {
    await this.ensureSectionOwned(accountId, estimateId, sectionId);
    const data = this.normalizeItem(dto);
    const item = await (this.prisma as any).estimateItem.update({
      where: { id: itemId },
      data,
    });
    await this.recalcSectionTotal(sectionId);
    await this.recalcEstimateTotal(estimateId);
    return item;
  }

  async deleteItem(
    accountId: number,
    estimateId: number,
    sectionId: number,
    itemId: number,
  ) {
    await this.ensureSectionOwned(accountId, estimateId, sectionId);
    await (this.prisma as any).estimateItem.delete({ where: { id: itemId } });
    await this.recalcSectionTotal(sectionId);
    await this.recalcEstimateTotal(estimateId);
    return { id: itemId };
  }

  /* ── helpers ── */

  private async ensureSectionOwned(accountId: number, estimateId: number, sectionId: number) {
    const row = await (this.prisma as any).estimateSection.findFirst({
      where: { id: sectionId, estimateId, estimate: { accountId, deletedAt: null } },
    });
    if (!row) throw new NotFoundException(`Section #${sectionId} not found`);
    return row;
  }

  private async recalcSectionTotal(sectionId: number) {
    const agg = await (this.prisma as any).estimateItem.aggregate({
      where: { sectionId },
      _sum: { amount: true },
    });
    const total = agg._sum.amount ?? 0;
    await (this.prisma as any).estimateSection.update({
      where: { id: sectionId },
      data: { totalAmount: total },
    });
  }

  private async recalcEstimateTotal(estimateId: number) {
    const agg = await (this.prisma as any).estimateSection.aggregate({
      where: { estimateId },
      _sum: { totalAmount: true },
    });
    const total = agg._sum.totalAmount ?? 0;
    await (this.prisma as any).estimate.update({
      where: { id: estimateId },
      data: { totalAmount: total },
    });
  }

  private normalize<T extends Record<string, any>>(dto: T): Record<string, any> {
    const out: Record<string, any> = {};
    const dateFields = ['docDate', 'periodFrom', 'periodTo', 'confirmedAt', 'sectionDate'];
    for (const [k, v] of Object.entries(dto)) {
      if (v === undefined) continue;
      if (dateFields.includes(k) && v) {
        out[k] = new Date(v as string);
        continue;
      }
      out[k] = v === '' ? null : v;
    }
    return out;
  }

  private normalizeItem(dto: UpsertItemDto): Record<string, any> {
    const data = this.normalize(dto);
    const quantity = Number(data.quantity ?? 0);
    const unitPrice = Number(data.unitPrice ?? 0);
    data.amount = Number((quantity * unitPrice).toFixed(2));
    return data;
  }
}
