import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateProposalDto } from '../dto/create-proposal.dto';
import { UpdateProposalDto } from '../dto/update-proposal.dto';

@Injectable()
export class ProposalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: number, page = 1, limit = 50, projectId?: number, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = { accountId };
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      (this.prisma as any).commercialProposal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { lines: { orderBy: { sortOrder: 'asc' } } },
      }),
      (this.prisma as any).commercialProposal.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).commercialProposal.findFirst({
      where: { id, accountId },
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async create(accountId: number, dto: CreateProposalDto, userId: number) {
    const { lines = [], ...rest } = dto;
    const proposalNumber = rest.proposalNumber || this.genNumber();
    const totalAmount = lines.reduce((s, l) => s + (Number(l.totalPrice) || Number(l.quantity ?? 1) * Number(l.unitPrice ?? 0)), 0);

    return (this.prisma as any).commercialProposal.create({
      data: {
        ...rest,
        proposalNumber,
        accountId,
        createdByUserId: userId,
        totalAmount,
        lines: {
          create: lines.map((l, i) => ({
            ...l,
            sortOrder: l.sortOrder ?? i,
            totalPrice: l.totalPrice ?? (Number(l.quantity ?? 1) * Number(l.unitPrice ?? 0)),
          })),
        },
      },
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async update(id: number, accountId: number, dto: UpdateProposalDto) {
    const { lines, ...rest } = dto;
    const data: any = { ...rest };
    if (lines !== undefined) {
      await (this.prisma as any).proposalLine.deleteMany({ where: { proposalId: id } });
      if (lines.length > 0) {
        await (this.prisma as any).proposalLine.createMany({
          data: lines.map((l, i) => ({
            ...l,
            proposalId: id,
            sortOrder: l.sortOrder ?? i,
            totalPrice: l.totalPrice ?? (Number(l.quantity ?? 1) * Number(l.unitPrice ?? 0)),
          })),
        });
      }
      data.totalAmount = lines.reduce((s, l) => s + (Number(l.totalPrice) || Number(l.quantity ?? 1) * Number(l.unitPrice ?? 0)), 0);
    }
    await (this.prisma as any).commercialProposal.updateMany({ where: { id, accountId }, data });
    return (this.prisma as any).commercialProposal.findFirst({
      where: { id, accountId },
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async addLine(id: number, accountId: number, line: any) {
    await (this.prisma as any).commercialProposal.findFirstOrThrow({ where: { id, accountId } });
    const created = await (this.prisma as any).proposalLine.create({
      data: {
        ...line,
        proposalId: id,
        totalPrice: line.totalPrice ?? (Number(line.quantity ?? 1) * Number(line.unitPrice ?? 0)),
      },
    });
    const lines = await (this.prisma as any).proposalLine.findMany({ where: { proposalId: id } });
    const totalAmount = lines.reduce((s: number, l: any) => s + (Number(l.totalPrice) || 0), 0);
    await (this.prisma as any).commercialProposal.updateMany({ where: { id, accountId }, data: { totalAmount } });
    return created;
  }

  async updateLine(lineId: number, accountId: number, data: { quantity?: number; unitPrice?: number; workStatus?: string; factQuantity?: number }) {
    const line = await (this.prisma as any).proposalLine.findFirst({
      where: { id: lineId },
      include: { proposal: true },
    });
    if (!line || line.proposal.accountId !== accountId) return null;
    const qty = data.quantity ?? Number(line.quantity);
    const price = data.unitPrice ?? Number(line.unitPrice);
    const updated = await (this.prisma as any).proposalLine.update({
      where: { id: lineId },
      data: { ...data, totalPrice: qty * price },
    });
    const lines = await (this.prisma as any).proposalLine.findMany({ where: { proposalId: line.proposalId } });
    const totalAmount = lines.reduce((s: number, l: any) => s + (Number(l.totalPrice) || 0), 0);
    await (this.prisma as any).commercialProposal.updateMany({ where: { id: line.proposalId }, data: { totalAmount } });
    return updated;
  }

  async deleteLine(lineId: number, accountId: number) {
    const line = await (this.prisma as any).proposalLine.findFirst({
      where: { id: lineId },
      include: { proposal: true },
    });
    if (!line || line.proposal.accountId !== accountId) return null;
    await (this.prisma as any).proposalLine.delete({ where: { id: lineId } });
    const lines = await (this.prisma as any).proposalLine.findMany({ where: { proposalId: line.proposalId } });
    const totalAmount = lines.reduce((s: number, l: any) => s + (Number(l.totalPrice) || 0), 0);
    await (this.prisma as any).commercialProposal.updateMany({ where: { id: line.proposalId }, data: { totalAmount } });
    return { success: true };
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).commercialProposal.deleteMany({ where: { id, accountId } });
  }

  private genNumber(): string {
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const rand = Math.floor(Math.random() * 900) + 100;
    return `КП-${date}-${rand}`;
  }
}
