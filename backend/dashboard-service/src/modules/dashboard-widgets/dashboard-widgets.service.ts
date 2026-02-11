import { Injectable, NotFoundException } from '@nestjs/common';
import { DashboardWidgetRepository } from './repositories/dashboard-widget.repository';
import { CreateDashboardWidgetDto } from './dto/create-dashboard-widget.dto';
import { UpdateDashboardWidgetDto } from './dto/update-dashboard-widget.dto';

@Injectable()
export class DashboardWidgetsService {
  constructor(private readonly repo: DashboardWidgetRepository) {}
  async findAll(userId: number, page: number, limit: number) { return this.repo.findAll(userId, page, limit); }
  async findById(id: number, userId: number) { const w = await this.repo.findById(id, userId); if (!w) throw new NotFoundException(`Dashboard widget #${id} not found`); return w; }
  async create(userId: number, dto: CreateDashboardWidgetDto) { return this.repo.create(userId, dto); }
  async update(id: number, userId: number, dto: UpdateDashboardWidgetDto) { await this.findById(id, userId); return this.repo.update(id, userId, dto); }
  async delete(id: number, userId: number) { await this.findById(id, userId); return this.repo.delete(id, userId); }
}
