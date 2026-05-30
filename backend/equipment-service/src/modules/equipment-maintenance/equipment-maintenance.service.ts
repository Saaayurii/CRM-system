import { Injectable, NotFoundException } from '@nestjs/common';
import { EquipmentMaintenanceRepository } from './repositories/equipment-maintenance.repository';
import { NotificationsClientService } from '../../common/notifications/notifications-client.service';
import {
  CreateEquipmentMaintenanceDto,
  UpdateEquipmentMaintenanceDto,
} from './dto';

const WAREHOUSE_ROLES = [1, 2, 4, 7];

@Injectable()
export class EquipmentMaintenanceService {
  constructor(
    private readonly maintenanceRepository: EquipmentMaintenanceRepository,
    private readonly notificationsClient: NotificationsClientService,
  ) {}

  async findAll(
    accountId: number,
    page: number,
    limit: number,
    equipmentId?: number,
  ) {
    return this.maintenanceRepository.findAll(
      accountId,
      page,
      limit,
      equipmentId,
    );
  }

  async findById(id: number, accountId: number) {
    const record = await this.maintenanceRepository.findById(id, accountId);
    if (!record) {
      throw new NotFoundException(
        `Equipment maintenance record with ID ${id} not found`,
      );
    }
    return record;
  }

  async create(
    accountId: number,
    dto: CreateEquipmentMaintenanceDto,
    actorUserId?: number,
  ) {
    const record = await this.maintenanceRepository.create({
      ...dto,
      maintenanceDate: new Date(dto.maintenanceDate),
      nextMaintenanceDate: dto.nextMaintenanceDate
        ? new Date(dto.nextMaintenanceDate)
        : undefined,
    });

    void this.notificationsClient.broadcast({
      accountId,
      roleIds: WAREHOUSE_ROLES,
      excludeUserId: actorUserId,
      title: 'Запланировано ТО оборудования',
      message: dto.description || undefined,
      notificationType: 'equipment_maintenance',
      priority: 1,
      channels: ['in_app'],
      actionUrl: `/dashboard/warehouse/maintenance`,
      entityType: 'equipment_maintenance',
      entityId: record.id,
    });

    return record;
  }

  async update(
    id: number,
    accountId: number,
    dto: UpdateEquipmentMaintenanceDto,
  ) {
    await this.findById(id, accountId);
    const data: any = { ...dto };
    if (dto.maintenanceDate)
      data.maintenanceDate = new Date(dto.maintenanceDate);
    if (dto.nextMaintenanceDate)
      data.nextMaintenanceDate = new Date(dto.nextMaintenanceDate);
    await this.maintenanceRepository.update(id, accountId, data);
    return this.findById(id, accountId);
  }

  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    await this.maintenanceRepository.delete(id, accountId);
    return {
      message: `Equipment maintenance record with ID ${id} deleted successfully`,
    };
  }
}
