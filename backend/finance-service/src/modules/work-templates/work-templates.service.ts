import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkTemplateRepository } from './repositories/work-template.repository';
import { CreateWorkTemplateDto } from './dto/create-work-template.dto';
import { UpdateWorkTemplateDto } from './dto/update-work-template.dto';

@Injectable()
export class WorkTemplatesService {
  constructor(private readonly repo: WorkTemplateRepository) {}

  findAll(accountId: number, page: number, limit: number, search?: string, category?: string) {
    return this.repo.findAll(accountId, page, limit, search, category);
  }

  async findById(id: number, accountId: number) {
    const item = await this.repo.findById(id, accountId);
    if (!item) throw new NotFoundException(`WorkTemplate ${id} not found`);
    return item;
  }

  create(accountId: number, dto: CreateWorkTemplateDto) {
    return this.repo.create(accountId, dto);
  }

  async update(id: number, accountId: number, dto: UpdateWorkTemplateDto) {
    await this.findById(id, accountId);
    return this.repo.update(id, accountId, dto);
  }

  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    return this.repo.delete(id, accountId);
  }

  categories(accountId: number) {
    return this.repo.categories(accountId);
  }
}
