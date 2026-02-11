import { Injectable, NotFoundException } from '@nestjs/common';
import { TimeOffRepository } from './repositories/time-off.repository';
import { CreateTimeOffRequestDto, UpdateTimeOffRequestDto } from './dto';

@Injectable()
export class TimeOffService {
  constructor(private readonly repository: TimeOffRepository) {}

  async findAll(userId: number, page = 1, limit = 20) {
    return this.repository.findAll(userId, page, limit);
  }

  async findById(id: number, userId: number) {
    const request = await this.repository.findById(id, userId);
    if (!request)
      throw new NotFoundException(`Time-off request #${id} not found`);
    return request;
  }

  async create(userId: number, dto: CreateTimeOffRequestDto) {
    return this.repository.create(userId, dto);
  }

  async update(id: number, userId: number, dto: UpdateTimeOffRequestDto) {
    const request = await this.repository.update(id, userId, dto);
    if (!request)
      throw new NotFoundException(`Time-off request #${id} not found`);
    return request;
  }

  async delete(id: number, userId: number) {
    const request = await this.repository.delete(id, userId);
    if (!request)
      throw new NotFoundException(`Time-off request #${id} not found`);
    return request;
  }
}
