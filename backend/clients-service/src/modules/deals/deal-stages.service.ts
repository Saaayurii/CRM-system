import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DealStageRepository } from './repositories/deal-stage.repository';
import { CreateDealStageDto, UpdateDealStageDto } from './dto';

@Injectable()
export class DealStagesService {
  constructor(private readonly repo: DealStageRepository) {}

  findAll(accountId: number) {
    return this.repo.findAll(accountId);
  }

  create(accountId: number, dto: CreateDealStageDto) {
    return this.repo.create(accountId, dto);
  }

  async update(id: number, accountId: number, dto: UpdateDealStageDto) {
    const existing = await this.repo.findById(id, accountId);
    if (!existing) throw new NotFoundException(`Deal stage #${id} not found`);
    await this.repo.update(id, accountId, dto);
    return this.repo.findById(id, accountId);
  }

  async delete(id: number, accountId: number) {
    const existing = await this.repo.findById(id, accountId);
    if (!existing) throw new NotFoundException(`Deal stage #${id} not found`);
    const count = await this.repo.countDeals(id, accountId);
    if (count > 0)
      throw new BadRequestException(
        'В стадии есть сделки — перенесите их перед удалением',
      );
    await this.repo.delete(id, accountId);
    return { message: `Deal stage #${id} deleted` };
  }
}
