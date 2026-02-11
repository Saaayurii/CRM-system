import { Injectable, NotFoundException } from '@nestjs/common';
import { AutomationRuleRepository } from './repositories/automation-rule.repository';
import { CreateAutomationRuleDto } from './dto/create-automation-rule.dto';
import { UpdateAutomationRuleDto } from './dto/update-automation-rule.dto';

@Injectable()
export class AutomationRulesService {
  constructor(private readonly repo: AutomationRuleRepository) {}
  async findAll(accountId: number, page: number, limit: number) {
    return this.repo.findAll(accountId, page, limit);
  }
  async findById(id: number, accountId: number) {
    const r = await this.repo.findById(id, accountId);
    if (!r) throw new NotFoundException(`Automation rule #${id} not found`);
    return r;
  }
  async create(
    accountId: number,
    userId: number,
    dto: CreateAutomationRuleDto,
  ) {
    return this.repo.create(accountId, userId, dto);
  }
  async update(id: number, accountId: number, dto: UpdateAutomationRuleDto) {
    await this.findById(id, accountId);
    return this.repo.update(id, accountId, dto);
  }
  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    return this.repo.delete(id, accountId);
  }
}
