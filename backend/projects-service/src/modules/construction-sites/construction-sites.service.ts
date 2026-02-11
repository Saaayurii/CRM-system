import { Injectable, NotFoundException } from '@nestjs/common';
import { ConstructionSiteRepository } from './repositories/construction-site.repository';
import { CreateConstructionSiteDto, UpdateConstructionSiteDto } from './dto';

@Injectable()
export class ConstructionSitesService {
  constructor(private readonly constructionSiteRepository: ConstructionSiteRepository) {}

  async findAll(
    page: number,
    limit: number,
    projectId?: number,
    status?: number,
  ) {
    return this.constructionSiteRepository.findAll(projectId, page, limit, status);
  }

  async findById(id: number) {
    const site = await this.constructionSiteRepository.findById(id);
    if (!site) {
      throw new NotFoundException(`Construction site with ID ${id} not found`);
    }
    return site;
  }

  async create(dto: CreateConstructionSiteDto) {
    return this.constructionSiteRepository.create({
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : undefined,
      actualEndDate: dto.actualEndDate ? new Date(dto.actualEndDate) : undefined,
    });
  }

  async update(id: number, dto: UpdateConstructionSiteDto) {
    await this.findById(id);
    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.plannedEndDate) data.plannedEndDate = new Date(dto.plannedEndDate);
    if (dto.actualEndDate) data.actualEndDate = new Date(dto.actualEndDate);
    await this.constructionSiteRepository.update(id, data);
    return this.findById(id);
  }

  async delete(id: number) {
    await this.findById(id);
    await this.constructionSiteRepository.delete(id);
    return { message: `Construction site with ID ${id} deleted successfully` };
  }
}
