import { Module } from '@nestjs/common';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';
import { BudgetRepository } from './repositories/budget.repository';

@Module({
  controllers: [BudgetsController],
  providers: [BudgetsService, BudgetRepository],
  exports: [BudgetsService],
})
export class BudgetsModule {}
