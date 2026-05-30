import { Injectable, NotFoundException } from '@nestjs/common';
import { EquipmentRepository } from './repositories/equipment.repository';
import { NotificationsClientService } from '../../common/notifications/notifications-client.service';
import { CreateEquipmentDto, UpdateEquipmentDto } from './dto';

// Admins + PM + warehouse keeper get warehouse activity
const WAREHOUSE_ROLES = [1, 2, 4, 7];

@Injectable()
export class EquipmentService {
  constructor(
    private readonly equipmentRepository: EquipmentRepository,
    private readonly notificationsClient: NotificationsClientService,
  ) {}

  async findAll(
    accountId: number,
    page: number,
    limit: number,
    status?: number,
    siteId?: number,
  ) {
    return this.equipmentRepository.findAll(
      accountId,
      page,
      limit,
      status,
      siteId,
    );
  }

  async findById(id: number, accountId: number) {
    const equipment = await this.equipmentRepository.findById(id, accountId);
    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${id} not found`);
    }
    return equipment;
  }

  async create(accountId: number, dto: CreateEquipmentDto, actorUserId?: number) {
    const equipment = await this.equipmentRepository.create({
      ...dto,
      accountId,
      purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
      lastMaintenanceDate: dto.lastMaintenanceDate
        ? new Date(dto.lastMaintenanceDate)
        : undefined,
      nextMaintenanceDate: dto.nextMaintenanceDate
        ? new Date(dto.nextMaintenanceDate)
        : undefined,
    });

    void this.notificationsClient.broadcast({
      accountId,
      roleIds: WAREHOUSE_ROLES,
      excludeUserId: actorUserId,
      title: `Добавлено оборудование: ${equipment.name}`,
      message: equipment.serialNumber ? `S/N: ${equipment.serialNumber}` : undefined,
      notificationType: 'equipment_added',
      priority: 1,
      channels: ['in_app'],
      actionUrl: `/dashboard/warehouse/equipment/${equipment.id}`,
      entityType: 'equipment',
      entityId: equipment.id,
    });

    return equipment;
  }

  async update(id: number, accountId: number, dto: UpdateEquipmentDto) {
    await this.findById(id, accountId);
    const data: any = { ...dto };
    if (dto.purchaseDate) data.purchaseDate = new Date(dto.purchaseDate);
    if (dto.lastMaintenanceDate)
      data.lastMaintenanceDate = new Date(dto.lastMaintenanceDate);
    if (dto.nextMaintenanceDate)
      data.nextMaintenanceDate = new Date(dto.nextMaintenanceDate);
    await this.equipmentRepository.update(id, accountId, data);
    return this.findById(id, accountId);
  }

  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    await this.equipmentRepository.delete(id, accountId);
    return { message: `Equipment with ID ${id} deleted successfully` };
  }
}
