import { Injectable, NotFoundException } from '@nestjs/common';
import { EquipmentMaintenanceRepository } from './repositories/equipment-maintenance.repository';
import { CreateEquipmentMaintenanceDto, UpdateEquipmentMaintenanceDto } from './dto';

@Injectable()
export class EquipmentMaintenanceService {
  constructor(private readonly maintenanceRepository: EquipmentMaintenanceRepository) {}

  async findAll(
    accountId: number,
    page: number,
    limit: number,
    equipmentId?: number,
  ) {
    return this.maintenanceRepository.findAll(accountId, page, limit, equipmentId);
  }

  async findById(id: number, accountId: number) {
    const record = await this.maintenanceRepository.findById(id, accountId);
    if (!record) {
      throw new NotFoundException(`Equipment maintenance record with ID ${id} not found`);
    }
    return record;
  }

  async create(accountId: number, dto: CreateEquipmentMaintenanceDto) {
    return this.maintenanceRepository.create({
      ...dto,
      maintenanceDate: new Date(dto.maintenanceDate),
      nextMaintenanceDate: dto.nextMaintenanceDate ? new Date(dto.nextMaintenanceDate) : undefined,
    });
  }

  async update(id: number, accountId: number, dto: UpdateEquipmentMaintenanceDto) {
    await this.findById(id, accountId);
    const data: any = { ...dto };
    if (dto.maintenanceDate) data.maintenanceDate = new Date(dto.maintenanceDate);
    if (dto.nextMaintenanceDate) data.nextMaintenanceDate = new Date(dto.nextMaintenanceDate);
    await this.maintenanceRepository.update(id, accountId, data);
    return this.findById(id, accountId);
  }

  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    await this.maintenanceRepository.delete(id, accountId);
    return { message: `Equipment maintenance record with ID ${id} deleted successfully` };
  }
}
