import { Injectable, NotFoundException } from '@nestjs/common';
import { BuildingObjectRepository } from './repositories/building-object.repository';
import { CreateBuildingObjectDto } from './dto/create-building-object.dto';
import { UpdateBuildingObjectDto } from './dto/update-building-object.dto';

@Injectable()
export class BuildingObjectsService {
  constructor(private readonly repo: BuildingObjectRepository) {}

  findAll(accountId: number, opts: { projectId?: number; constructionSiteId?: number; parentId?: number | null; objectType?: string; status?: string; page?: number; limit?: number }) {
    return this.repo.findAll(accountId, opts);
  }

  async findById(id: number, accountId: number) {
    const obj = await this.repo.findById(id, accountId);
    if (!obj) throw new NotFoundException(`BuildingObject ${id} not found`);
    return obj;
  }

  create(accountId: number, dto: CreateBuildingObjectDto, userId: number) {
    return this.repo.create(accountId, dto, userId);
  }

  async update(id: number, accountId: number, dto: UpdateBuildingObjectDto) {
    await this.findById(id, accountId);
    await this.repo.update(id, accountId, dto);
    return this.repo.findById(id, accountId);
  }

  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    await this.repo.delete(id, accountId);
    return { message: 'Deleted' };
  }
}
