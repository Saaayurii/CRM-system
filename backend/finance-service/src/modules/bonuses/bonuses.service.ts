import { Injectable, NotFoundException } from '@nestjs/common';
import { BonusRepository } from './repositories/bonus.repository';
import { CreateBonusDto } from './dto/create-bonus.dto';
import { UpdateBonusDto } from './dto/update-bonus.dto';

@Injectable()
export class BonusesService {
  constructor(private readonly bonusRepository: BonusRepository) {}

  async findAll(
    accountId: number,
    page: number,
    limit: number,
    filters?: { userId?: number; projectId?: number; status?: number },
  ) {
    return this.bonusRepository.findAll(accountId, page, limit, filters);
  }

  async findById(id: number, accountId: number) {
    const bonus = await this.bonusRepository.findById(id, accountId);
    if (!bonus) {
      throw new NotFoundException(`Bonus with ID ${id} not found`);
    }
    return bonus;
  }

  async create(accountId: number, dto: CreateBonusDto) {
    return this.bonusRepository.create(accountId, dto);
  }

  async update(id: number, accountId: number, dto: UpdateBonusDto) {
    await this.findById(id, accountId);
    return this.bonusRepository.update(id, accountId, dto);
  }

  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    return this.bonusRepository.delete(id, accountId);
  }
}
