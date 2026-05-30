import { Injectable, NotFoundException } from '@nestjs/common';
import { InventoryRepository } from './repositories/inventory.repository';
import { NotificationsClientService } from '../../common/notifications/notifications-client.service';
import { CreateInventorySessionDto, UpdateInventorySessionDto, CreateInventoryItemDto } from './dto';

const WAREHOUSE_ROLES = [1, 2, 4, 7];

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly notificationsClient: NotificationsClientService,
  ) {}

  async findAll(accountId: number, projectId?: number) {
    return this.inventoryRepository.findAll(accountId, projectId);
  }

  async findById(id: number, accountId: number) {
    const session = await this.inventoryRepository.findById(id, accountId);
    if (!session) throw new NotFoundException(`Inventory session ${id} not found`);
    return session;
  }

  async create(accountId: number, userId: number, dto: CreateInventorySessionDto) {
    const session = await this.inventoryRepository.create(accountId, userId, dto);

    void this.notificationsClient.broadcast({
      accountId,
      roleIds: WAREHOUSE_ROLES,
      excludeUserId: userId,
      title: `Создана инвентаризация: ${session.name ?? '#' + session.id}`,
      notificationType: 'inventory_created',
      priority: 1,
      channels: ['in_app'],
      actionUrl: `/dashboard/warehouse/inventory/${session.id}`,
      entityType: 'inventory_session',
      entityId: session.id,
    });

    return session;
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
