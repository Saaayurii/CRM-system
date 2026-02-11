import { Injectable, NotFoundException } from '@nestjs/common';
import { TrainingProgressRepository } from './repositories/training-progress.repository';
import { CreateTrainingProgressDto } from './dto/create-training-progress.dto';
import { UpdateTrainingProgressDto } from './dto/update-training-progress.dto';

@Injectable()
export class TrainingProgressService {
  constructor(private readonly repo: TrainingProgressRepository) {}
  async findAll(page: number, limit: number, userId?: number, tmId?: number) { return this.repo.findAll(page, limit, userId, tmId); }
  async findById(id: number) { const p = await this.repo.findById(id); if (!p) throw new NotFoundException(`Training progress #${id} not found`); return p; }
  async create(dto: CreateTrainingProgressDto) { return this.repo.create(dto); }
  async update(id: number, dto: UpdateTrainingProgressDto) { await this.findById(id); return this.repo.update(id, dto); }
}
