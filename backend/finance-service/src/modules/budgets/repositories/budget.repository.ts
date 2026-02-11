import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateBudgetDto } from '../dto/create-budget.dto';
import { UpdateBudgetDto } from '../dto/update-budget.dto';
import { CreateBudgetItemDto } from '../dto/create-budget-item.dto';

@Injectable()
export class BudgetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      (this.prisma as any).budget.findMany({
        where: { accountId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      (this.prisma as any).budget.count({ where: { accountId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).budget.findFirst({
      where: { id, accountId },
      include: { items: true },
    });
  }

  async create(
    accountId: number,
    dto: CreateBudgetDto,
    createdByUserId: number,
  ) {
    return (this.prisma as any).budget.create({
      data: { ...dto, accountId, createdByUserId },
    });
  }

  async update(id: number, accountId: number, dto: UpdateBudgetDto) {
    return (this.prisma as any).budget
      .updateMany({
        where: { id, accountId },
        data: dto,
      })
      .then(async () => {
        return (this.prisma as any).budget.findFirst({
          where: { id, accountId },
        });
      });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).budget.deleteMany({
      where: { id, accountId },
    });
  }

  async createItem(budgetId: number, dto: CreateBudgetItemDto) {
    return (this.prisma as any).budgetItem.create({
      data: { ...dto, budgetId },
    });
  }
}
