import { Injectable, NotFoundException } from '@nestjs/common';
import { ClientPortalAccessRepository } from './repositories/client-portal-access.repository';
import { CreateClientPortalAccessDto } from './dto/create-client-portal-access.dto';
import { UpdateClientPortalAccessDto } from './dto/update-client-portal-access.dto';

@Injectable()
export class ClientPortalAccessService {
  constructor(private readonly repo: ClientPortalAccessRepository) {}

  async findAll(page: number, limit: number, clientId?: number) {
    return this.repo.findAll(page, limit, clientId);
  }

  async findById(id: number) {
    const r = await this.repo.findById(id);
    if (!r) throw new NotFoundException(`Client portal access #${id} not found`);
    return r;
  }

  async create(dto: CreateClientPortalAccessDto) {
    return this.repo.create(dto);
  }

  async update(id: number, dto: UpdateClientPortalAccessDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: number) {
    await this.findById(id);
    return this.repo.delete(id);
  }
}
