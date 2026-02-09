import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { WarehouseRepository } from './repositories/warehouse.repository';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  CreateWarehouseMovementDto,
  CreateInventoryCheckDto,
  UpdateInventoryCheckDto,
} from './dto';

@Injectable()
export class WarehousesService {
  constructor(private readonly warehouseRepository: WarehouseRepository) {}

  // Warehouses
  async findAll(
    accountId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ warehouses: any[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const [warehouses, total] = await Promise.all([
      this.warehouseRepository.findAll(accountId, { skip, take: limit }),
      this.warehouseRepository.count(accountId),
    ]);

    return {
      warehouses,
      total,
      page,
      limit,
    };
  }

  async findById(id: number, requestingUserAccountId: number) {
    const warehouse = await this.warehouseRepository.findById(id);
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    if (warehouse.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return warehouse;
  }

  async create(
    createDto: CreateWarehouseDto,
    requestingUserAccountId: number,
  ) {
    if (createDto.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Cannot create warehouses in another account');
    }

    return this.warehouseRepository.create(createDto);
  }

  async update(
    id: number,
    updateDto: UpdateWarehouseDto,
    requestingUserAccountId: number,
  ) {
    const warehouse = await this.warehouseRepository.findById(id);
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    if (warehouse.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return this.warehouseRepository.update(id, updateDto);
  }

  async remove(id: number, requestingUserAccountId: number): Promise<void> {
    const warehouse = await this.warehouseRepository.findById(id);
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    if (warehouse.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    await this.warehouseRepository.delete(id);
  }

  // Warehouse Stock
  async getStock(warehouseId: number, requestingUserAccountId: number) {
    const warehouse = await this.warehouseRepository.findById(warehouseId);
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    if (warehouse.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return this.warehouseRepository.findStock(warehouseId);
  }

  // Warehouse Movements
  async createMovement(
    createDto: CreateWarehouseMovementDto,
    requestingUserAccountId: number,
  ) {
    if (createDto.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Cannot create movements in another account');
    }

    return this.warehouseRepository.createMovement(createDto);
  }

  // Inventory Checks
  async findAllInventoryChecks(
    page: number = 1,
    limit: number = 20,
    warehouseId?: number,
    status?: number,
  ): Promise<{ inventoryChecks: any[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const [inventoryChecks, total] = await Promise.all([
      this.warehouseRepository.findAllInventoryChecks(warehouseId, { skip, take: limit, status }),
      this.warehouseRepository.countInventoryChecks(warehouseId, status),
    ]);

    return {
      inventoryChecks,
      total,
      page,
      limit,
    };
  }

  async findInventoryCheckById(id: number, requestingUserAccountId: number) {
    const inventoryCheck = await this.warehouseRepository.findInventoryCheckById(id);
    if (!inventoryCheck) {
      throw new NotFoundException('Inventory check not found');
    }

    // Verify access through the warehouse's accountId
    const warehouse = await this.warehouseRepository.findById(inventoryCheck.warehouseId);
    if (warehouse && warehouse.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return inventoryCheck;
  }

  async createInventoryCheck(
    createDto: CreateInventoryCheckDto,
    requestingUserAccountId: number,
  ) {
    // Verify warehouse belongs to user's account
    const warehouse = await this.warehouseRepository.findById(createDto.warehouseId);
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    if (warehouse.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    const existing = await this.warehouseRepository.findInventoryCheckByNumber(createDto.checkNumber);
    if (existing) {
      throw new ConflictException('Inventory check with this number already exists');
    }

    return this.warehouseRepository.createInventoryCheck(createDto);
  }

  async updateInventoryCheck(
    id: number,
    updateDto: UpdateInventoryCheckDto,
    requestingUserAccountId: number,
  ) {
    const inventoryCheck = await this.warehouseRepository.findInventoryCheckById(id);
    if (!inventoryCheck) {
      throw new NotFoundException('Inventory check not found');
    }

    const warehouse = await this.warehouseRepository.findById(inventoryCheck.warehouseId);
    if (warehouse && warehouse.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return this.warehouseRepository.updateInventoryCheck(id, updateDto);
  }
}
