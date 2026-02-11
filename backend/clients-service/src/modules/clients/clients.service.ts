import { Injectable, NotFoundException } from '@nestjs/common';
import { ClientsRepository } from './repositories/clients.repository';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly repo: ClientsRepository) {}

  async findAll(
    accountId: number,
    page: number,
    limit: number,
    status?: string,
    managerId?: number,
  ) {
    return this.repo.findAll(accountId, page, limit, status, managerId);
  }

  async findById(id: number, accountId: number) {
    const c = await this.repo.findById(id, accountId);
    if (!c) throw new NotFoundException(`Client #${id} not found`);
    return c;
  }

  async create(accountId: number, dto: CreateClientDto) {
    return this.repo.create(accountId, dto);
  }

  async update(id: number, accountId: number, dto: UpdateClientDto) {
    await this.findById(id, accountId);
    return this.repo.update(id, accountId, dto);
  }

  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    return this.repo.delete(id, accountId);
  }
}
