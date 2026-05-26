import { Injectable, NotFoundException } from '@nestjs/common';
import { TrainingProgressRepository } from './repositories/training-progress.repository';
import { CreateTrainingProgressDto } from './dto/create-training-progress.dto';
import { UpdateTrainingProgressDto } from './dto/update-training-progress.dto';

@Injectable()
export class TrainingProgressService {
  constructor(private readonly repo: TrainingProgressRepository) {}
  async findAll(page: number, limit: number, userId?: number, tmId?: number) {
    return this.repo.findAll(page, limit, userId, tmId);
  }
  async findById(id: number) {
    const p = await this.repo.findById(id);
    if (!p) throw new NotFoundException(`Training progress #${id} not found`);
    return p;
  }
  async create(dto: CreateTrainingProgressDto) {
    return this.repo.create(dto);
  }
  async update(id: number, dto: UpdateTrainingProgressDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }
  async stats(accountId: number) {
    const rows = await this.repo.statsByAccount(accountId);
    // Aggregate: per material — totals + per user — totals
    const perMaterial: Record<number, { total: number; completed: number; inProgress: number }> = {};
    const perUser: Record<number, { total: number; completed: number; inProgress: number }> = {};
    let totalCompleted = 0;
    let totalInProgress = 0;
    for (const r of rows) {
      const mat = (perMaterial[r.trainingMaterialId] ||= {
        total: 0,
        completed: 0,
        inProgress: 0,
      });
      const usr = (perUser[r.userId] ||= {
        total: 0,
        completed: 0,
        inProgress: 0,
      });
      mat.total += 1;
      usr.total += 1;
      if (r.progressPercentage >= 100) {
        mat.completed += 1;
        usr.completed += 1;
        totalCompleted += 1;
      } else if (r.progressPercentage > 0 || r.startedAt) {
        mat.inProgress += 1;
        usr.inProgress += 1;
        totalInProgress += 1;
      }
    }
    return {
      rows,
      perMaterial,
      perUser,
      summary: {
        totalRecords: rows.length,
        totalCompleted,
        totalInProgress,
      },
    };
  }
}
