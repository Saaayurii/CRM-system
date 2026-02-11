import { Injectable, NotFoundException } from '@nestjs/common';
import { TrainingMaterialRepository } from './repositories/training-material.repository';
import { CreateTrainingMaterialDto } from './dto/create-training-material.dto';
import { UpdateTrainingMaterialDto } from './dto/update-training-material.dto';

@Injectable()
export class TrainingMaterialsService {
  constructor(private readonly repo: TrainingMaterialRepository) {}
  async findAll(
    accountId: number,
    page: number,
    limit: number,
    category?: string,
  ) {
    return this.repo.findAll(accountId, page, limit, category);
  }
  async findById(id: number, accountId: number) {
    const m = await this.repo.findById(id, accountId);
    if (!m) throw new NotFoundException(`Training material #${id} not found`);
    return m;
  }
  async create(accountId: number, dto: CreateTrainingMaterialDto) {
    return this.repo.create(accountId, dto);
  }
  async update(id: number, accountId: number, dto: UpdateTrainingMaterialDto) {
    await this.findById(id, accountId);
    return this.repo.update(id, accountId, dto);
  }
  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    return this.repo.delete(id, accountId);
  }
}
