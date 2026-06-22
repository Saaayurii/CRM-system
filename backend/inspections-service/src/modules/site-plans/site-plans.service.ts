import { Injectable, NotFoundException } from '@nestjs/common';
import { SitePlanRepository } from './repositories/site-plan.repository';
import { CreateSitePlanDto, UpdateSitePlanDto } from './dto';

@Injectable()
export class SitePlansService {
  constructor(private readonly repo: SitePlanRepository) {}

  findAll(accountId: number, projectId?: number, constructionSiteId?: number) {
    return this.repo.findAll(accountId, projectId, constructionSiteId);
  }

  async findById(id: number, accountId: number) {
    const plan = await this.repo.findWithDefects(id, accountId);
    if (!plan) throw new NotFoundException(`Site plan #${id} not found`);
    return plan;
  }

  create(accountId: number, dto: CreateSitePlanDto, actorUserId?: number) {
    return this.repo.create({ ...dto, accountId, createdByUserId: actorUserId });
  }

  async update(id: number, accountId: number, dto: UpdateSitePlanDto) {
    const existing = await this.repo.findById(id, accountId);
    if (!existing) throw new NotFoundException(`Site plan #${id} not found`);
    await this.repo.update(id, accountId, { ...dto });
    return this.repo.findById(id, accountId);
  }

  async delete(id: number, accountId: number) {
    const existing = await this.repo.findById(id, accountId);
    if (!existing) throw new NotFoundException(`Site plan #${id} not found`);
    await this.repo.softDelete(id, accountId);
    return { message: `Site plan #${id} deleted` };
  }
}
