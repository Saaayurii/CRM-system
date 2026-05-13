import { Injectable, NotFoundException } from '@nestjs/common';
import { WarehouseRepository } from './repositories/warehouse.repository';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto';

@Injectable()
export class WarehouseService {
  constructor(private readonly warehouseRepository: WarehouseRepository) {}

  async findAll(accountId: number) {
    return this.warehouseRepository.findAll(accountId);
  }

  async findById(id: number, accountId: number) {
    const warehouse = await this.warehouseRepository.findById(id, accountId);
    if (!warehouse) throw new NotFoundException(`Warehouse ${id} not found`);
    return warehouse;
  }

  async create(accountId: number, dto: CreateWarehouseDto) {
    return this.warehouseRepository.create({ ...dto, accountId });
  }

  async update(id: number, accountId: number, dto: UpdateWarehouseDto) {
    await this.findById(id, accountId);
    await this.warehouseRepository.update(id, accountId, dto);
    return this.findById(id, accountId);
  }

  async delete(id: number, accountId: number) {
    await this.findById(id, accountId);
    await this.warehouseRepository.delete(id, accountId);
    return { message: `Warehouse ${id} deleted` };
  }
}
