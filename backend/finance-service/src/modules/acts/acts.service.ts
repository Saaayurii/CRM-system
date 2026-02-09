import { Injectable, NotFoundException } from '@nestjs/common';
import { ActRepository } from './repositories/act.repository';
import { CreateActDto } from './dto/create-act.dto';
import { UpdateActDto } from './dto/update-act.dto';
import { CreateActItemDto } from './dto/create-act-item.dto';

@Injectable()
export class ActsService {
  constructor(private readonly actRepository: ActRepository) {}

  async findAll(accountId: number, page: number, limit: number) {
    return this.actRepository.findAll(accountId, page, limit);
  }

  async findById(id: number, accountId: number) {
    const act = await this.actRepository.findById(id, accountId);
    if (!act) {
      throw new NotFoundException(`Act with ID ${id} not found`);
    }
    return act;
  }

  async create(accountId: number, dto: CreateActDto, preparedByUserId: number) {
    return this.actRepository.create(accountId, dto, preparedByUserId);
  }

  async update(id: number, accountId: number, dto: UpdateActDto) {
    await this.findById(id, accountId);
    return this.actRepository.update(id, accountId, dto);
  }

  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    return this.actRepository.delete(id, accountId);
  }

  async createItem(id: number, accountId: number, dto: CreateActItemDto) {
    await this.findById(id, accountId);
    return this.actRepository.createItem(id, dto);
  }
}
