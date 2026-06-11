import { Injectable, NotFoundException } from '@nestjs/common';
import { BudgetRepository } from './repositories/budget.repository';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { CreateBudgetItemDto } from './dto/create-budget-item.dto';
import { PrismaService } from '../../database/prisma.service';
import {
  RequestUser,
  getClientAllowedProjectIds,
} from '../../common/helpers/client-access.helper';

@Injectable()
export class BudgetsService {
  constructor(
    private readonly budgetRepository: BudgetRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(user: RequestUser, page: number, limit: number, projectId?: number) {
    const allowedProjectIds = await getClientAllowedProjectIds(this.prisma, user);
    return this.budgetRepository.findAll(
      user.accountId,
      page,
      limit,
      projectId,
      allowedProjectIds,
    );
  }

  async findByIdForUser(id: number, user: RequestUser) {
    const allowedProjectIds = await getClientAllowedProjectIds(this.prisma, user);
    const budget = await this.budgetRepository.findById(
      id,
      user.accountId,
      allowedProjectIds,
    );
    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }
    return budget;
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
