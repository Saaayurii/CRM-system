import { Injectable, NotFoundException } from '@nestjs/common';
import { KnowledgeTestRepository } from './repositories/knowledge-test.repository';
import { CreateKnowledgeTestDto } from './dto/create-knowledge-test.dto';
import { UpdateKnowledgeTestDto } from './dto/update-knowledge-test.dto';

@Injectable()
export class KnowledgeTestsService {
  constructor(private readonly repo: KnowledgeTestRepository) {}
  async findAll(accountId: number, page: number, limit: number) {
    return this.repo.findAll(accountId, page, limit);
  }
  async findById(id: number, accountId: number) {
    const t = await this.repo.findById(id, accountId);
    if (!t) throw new NotFoundException(`Knowledge test #${id} not found`);
    return t;
  }
  async create(accountId: number, dto: CreateKnowledgeTestDto) {
    return this.repo.create(accountId, dto);
  }
  async update(id: number, accountId: number, dto: UpdateKnowledgeTestDto) {
    await this.findById(id, accountId);
    return this.repo.update(id, accountId, dto);
  }
  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    return this.repo.delete(id, accountId);
  }
}
