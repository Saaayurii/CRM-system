import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

// Дефолтная воронка, создаётся при первом обращении аккаунта
const DEFAULT_STAGES = [
  { name: 'Новая', color: '#64748b', sortOrder: 0 },
  { name: 'Квалификация', color: '#3b82f6', sortOrder: 1 },
  { name: 'Переговоры', color: '#f59e0b', sortOrder: 2 },
  { name: 'Договор', color: '#8b5cf6', sortOrder: 3 },
  { name: 'Выиграна', color: '#22c55e', sortOrder: 4, isWon: true },
  { name: 'Проиграна', color: '#ef4444', sortOrder: 5, isLost: true },
];

@Injectable()
export class DealStageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: number) {
    const existing = await (this.prisma as any).dealStage.findMany({
      where: { accountId },
      orderBy: { sortOrder: 'asc' },
    });
    if (existing.length > 0) return existing;

    // Сидируем дефолтную воронку для нового аккаунта
    await (this.prisma as any).dealStage.createMany({
      data: DEFAULT_STAGES.map((s) => ({ ...s, accountId })),
    });
    return (this.prisma as any).dealStage.findMany({
      where: { accountId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findFirst(accountId: number) {
    return (this.prisma as any).dealStage.findFirst({
      where: { accountId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).dealStage.findFirst({ where: { id, accountId } });
  }

  async create(accountId: number, data: any) {
    return (this.prisma as any).dealStage.create({ data: { ...data, accountId } });
  }

  async update(id: number, accountId: number, data: any) {
    return (this.prisma as any).dealStage.updateMany({
      where: { id, accountId },
      data,
    });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).dealStage.deleteMany({ where: { id, accountId } });
  }

  async countDeals(stageId: number, accountId: number) {
    return (this.prisma as any).deal.count({ where: { stageId, accountId } });
  }
}
