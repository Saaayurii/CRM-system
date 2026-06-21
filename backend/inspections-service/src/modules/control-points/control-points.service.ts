import { Injectable, NotFoundException } from '@nestjs/common';
import { ControlPointRepository } from './repositories/control-point.repository';
import { CreateControlPointDto, UpdateControlPointDto } from './dto/control-point.dto';

interface RequestUser {
  id: number;
  accountId: number;
  roleId: number;
}

@Injectable()
export class ControlPointsService {
  constructor(private readonly repo: ControlPointRepository) {}

  findAll(
    user: RequestUser,
    page: number,
    limit: number,
    status?: string,
    section?: string,
    q?: string,
  ) {
    return this.repo.findAll(user.accountId, page, limit, status, section, q);
  }

  async findById(id: number, user: RequestUser) {
    const cp = await this.repo.findById(id, user.accountId);
    if (!cp) throw new NotFoundException(`Control point ${id} not found`);
    return cp;
  }

  create(accountId: number, dto: CreateControlPointDto) {
    return this.repo.create({ ...dto, accountId });
  }

  async update(id: number, accountId: number, dto: UpdateControlPointDto) {
    const existing = await this.repo.findById(id, accountId);
    if (!existing) throw new NotFoundException(`Control point ${id} not found`);
    await this.repo.update(id, accountId, dto);
    return this.repo.findById(id, accountId);
  }

  async delete(id: number, accountId: number) {
    const existing = await this.repo.findById(id, accountId);
    if (!existing) throw new NotFoundException(`Control point ${id} not found`);
    await this.repo.delete(id, accountId);
    return { message: `Control point ${id} deleted` };
  }
}
