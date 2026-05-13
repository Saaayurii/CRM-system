import { Injectable, NotFoundException } from '@nestjs/common';
import { ProposalRepository } from './repositories/proposal.repository';
import { CreateProposalDto, CreateProposalLineDto } from './dto/create-proposal.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';

@Injectable()
export class CommercialProposalsService {
  constructor(private readonly repo: ProposalRepository) {}

  findAll(accountId: number, page: number, limit: number, projectId?: number, status?: string) {
    return this.repo.findAll(accountId, page, limit, projectId, status);
  }

  async findById(id: number, accountId: number) {
    const item = await this.repo.findById(id, accountId);
    if (!item) throw new NotFoundException(`Proposal ${id} not found`);
    return item;
  }

  create(accountId: number, dto: CreateProposalDto, userId: number) {
    return this.repo.create(accountId, dto, userId);
  }

  async update(id: number, accountId: number, dto: UpdateProposalDto) {
    await this.findById(id, accountId);
    return this.repo.update(id, accountId, dto);
  }

  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    return this.repo.delete(id, accountId);
  }

  addLine(id: number, accountId: number, line: CreateProposalLineDto) {
    return this.repo.addLine(id, accountId, line);
  }

  updateLine(lineId: number, accountId: number, data: any) {
    return this.repo.updateLine(lineId, accountId, data);
  }

  deleteLine(lineId: number, accountId: number) {
    return this.repo.deleteLine(lineId, accountId);
  }
}
