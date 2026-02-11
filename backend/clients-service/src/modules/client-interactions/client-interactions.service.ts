import { Injectable, NotFoundException } from '@nestjs/common';
import { ClientInteractionRepository } from './repositories/client-interaction.repository';
import { CreateClientInteractionDto } from './dto/create-client-interaction.dto';
import { UpdateClientInteractionDto } from './dto/update-client-interaction.dto';

@Injectable()
export class ClientInteractionsService {
  constructor(private readonly repo: ClientInteractionRepository) {}

  async findAll(page: number, limit: number, clientId?: number) {
    return this.repo.findAll(page, limit, clientId);
  }

  async findById(id: number) {
    const i = await this.repo.findById(id);
    if (!i) throw new NotFoundException(`Client interaction #${id} not found`);
    return i;
  }

  async create(dto: CreateClientInteractionDto) {
    return this.repo.create(dto);
  }

  async update(id: number, dto: UpdateClientInteractionDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: number) {
    await this.findById(id);
    return this.repo.delete(id);
  }
}
