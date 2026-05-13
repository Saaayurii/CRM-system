import { Injectable, NotFoundException } from '@nestjs/common';
import { InventoryRepository } from './repositories/inventory.repository';
import { CreateInventorySessionDto, UpdateInventorySessionDto, CreateInventoryItemDto } from './dto';

@Injectable()
export class InventoryService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async findAll(accountId: number, projectId?: number) {
    return this.inventoryRepository.findAll(accountId, projectId);
  }

  async findById(id: number, accountId: number) {
    const session = await this.inventoryRepository.findById(id, accountId);
    if (!session) throw new NotFoundException(`Inventory session ${id} not found`);
    return session;
  }

  async create(accountId: number, userId: number, dto: CreateInventorySessionDto) {
    return this.inventoryRepository.create(accountId, userId, dto);
  }

  async update(id: number, accountId: number, dto: UpdateInventorySessionDto) {
    await this.findById(id, accountId);
    await this.inventoryRepository.update(id, accountId, dto);
    return this.findById(id, accountId);
  }

  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    await this.inventoryRepository.delete(id, accountId);
    return { message: `Inventory session ${id} deleted` };
  }

  async addItem(sessionId: number, accountId: number, dto: CreateInventoryItemDto) {
    await this.findById(sessionId, accountId);
    return this.inventoryRepository.addItem(sessionId, dto);
  }

  async deleteItem(sessionId: number, itemId: number, accountId: number) {
    await this.findById(sessionId, accountId);
    return this.inventoryRepository.deleteItem(itemId);
  }
}
