import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FacilityRepository } from './repositories/facility.repository';
import { CreateFacilityDto, UpdateFacilityDto, CreateComponentDto, UpdateComponentDto } from './dto/create-facility.dto';

@Injectable()
export class FacilitiesService {
  constructor(private readonly repo: FacilityRepository) {}

  findByObject(objectId: number) {
    return this.repo.findByObject(objectId);
  }

  async findById(id: number, accountId: number) {
    const f = await this.repo.findById(id);
    if (!f) throw new NotFoundException(`Facility ${id} not found`);
    if (f.object?.accountId !== accountId) throw new ForbiddenException();
    return f;
  }

  create(dto: CreateFacilityDto, userId: number) {
    return this.repo.create(dto, userId);
  }

  async update(id: number, accountId: number, dto: UpdateFacilityDto) {
    await this.findById(id, accountId);
    return this.repo.update(id, dto);
  }

  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    await this.repo.delete(id);
    return { message: 'Deleted' };
  }

  async addComponent(facilityId: number, accountId: number, dto: CreateComponentDto) {
    await this.findById(facilityId, accountId);
    return this.repo.createComponent(facilityId, dto);
  }

  async updateComponent(facilityId: number, componentId: number, accountId: number, dto: UpdateComponentDto) {
    await this.findById(facilityId, accountId);
    return this.repo.updateComponent(componentId, dto);
  }

  async deleteComponent(facilityId: number, componentId: number, accountId: number) {
    await this.findById(facilityId, accountId);
    await this.repo.deleteComponent(componentId);
    return { message: 'Deleted' };
  }
}
