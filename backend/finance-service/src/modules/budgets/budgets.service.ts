import { Injectable, NotFoundException } from '@nestjs/common';
import { BudgetRepository } from './repositories/budget.repository';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { CreateBudgetItemDto } from './dto/create-budget-item.dto';

@Injectable()
export class BudgetsService {
  constructor(private readonly budgetRepository: BudgetRepository) {}

  async findAll(accountId: number, page: number, limit: number) {
    return this.budgetRepository.findAll(accountId, page, limit);
  }

  async findById(id: number, accountId: number) {
    const budget = await this.budgetRepository.findById(id, accountId);
    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }
    return budget;
  }

  async create(
    accountId: number,
    dto: CreateBudgetDto,
    createdByUserId: number,
  ) {
    return this.budgetRepository.create(accountId, dto, createdByUserId);
  }

  async update(id: number, accountId: number, dto: UpdateBudgetDto) {
    await this.findById(id, accountId);
    return this.budgetRepository.update(id, accountId, dto);
  }

  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    return this.budgetRepository.delete(id, accountId);
  }

  async createItem(id: number, accountId: number, dto: CreateBudgetItemDto) {
    await this.findById(id, accountId);
    return this.budgetRepository.createItem(id, dto);
  }
}
