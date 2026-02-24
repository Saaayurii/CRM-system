import { Injectable, NotFoundException } from '@nestjs/common';
import { TimeOffRepository } from './repositories/time-off.repository';
import { CreateTimeOffRequestDto, UpdateTimeOffRequestDto } from './dto';

@Injectable()
export class TimeOffService {
  constructor(private readonly repository: TimeOffRepository) {}

  async findAll(userId: number, roleId: number, page = 1, limit = 20) {
    const filterUserId = [1, 2, 3].includes(roleId) ? null : userId;
    return this.repository.findAll(filterUserId, page, limit);
  }

  async findById(id: number, userId: number, roleId: number) {
    const filterUserId = [1, 2, 3].includes(roleId) ? null : userId;
    const request = await this.repository.findById(id, filterUserId);
    if (!request)
      throw new NotFoundException(`Time-off request #${id} not found`);
    return request;
  }

  async create(userId: number, dto: CreateTimeOffRequestDto) {
    return this.repository.create(userId, dto);
  }

  async update(id: number, userId: number, roleId: number, dto: UpdateTimeOffRequestDto) {
    const filterUserId = [1, 2, 3].includes(roleId) ? null : userId;
    const request = await this.repository.update(id, filterUserId, dto);
    if (!request)
      throw new NotFoundException(`Time-off request #${id} not found`);
    return request;
  }

  async delete(id: number, userId: number, roleId: number) {
    const filterUserId = [1, 2, 3].includes(roleId) ? null : userId;
    const request = await this.repository.delete(id, filterUserId);
    if (!request)
      throw new NotFoundException(`Time-off request #${id} not found`);
    return request;
  }
}
