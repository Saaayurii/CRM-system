import { Injectable, NotFoundException } from '@nestjs/common';
import { ExecutionLogRepository } from './repositories/execution-log.repository';
import { CreateExecutionLogDto } from './dto/create-execution-log.dto';

@Injectable()
export class ExecutionLogService {
  constructor(private readonly repo: ExecutionLogRepository) {}
  async findAll(page: number, limit: number, automationRuleId?: number) { return this.repo.findAll(page, limit, automationRuleId); }
  async findById(id: number) { const l = await this.repo.findById(id); if (!l) throw new NotFoundException(`Execution log #${id} not found`); return l; }
  async create(dto: CreateExecutionLogDto) { return this.repo.create(dto); }
}
