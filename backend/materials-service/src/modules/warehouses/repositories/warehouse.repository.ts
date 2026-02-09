import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  CreateWarehouseMovementDto,
  CreateInventoryCheckDto,
  UpdateInventoryCheckDto,
} from '../dto';

@Injectable()
export class WarehouseRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Warehouses
  async findAll(accountId: number, options?: { skip?: number; take?: number; isActive?: boolean }) {
    const where: any = { accountId };
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    return (this.prisma as any).warehouse.findMany({
      where,
      include: {
        warehouseKeeper: {
          select: { id: true, name: true, email: true },
        },
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    return (this.prisma as any).warehouse.findFirst({
      where: { id },
      include: {
        warehouseKeeper: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async create(data: CreateWarehouseDto) {
    return (this.prisma as any).warehouse.create({
      data: {
        accountId: data.accountId,
        constructionSiteId: data.constructionSiteId,
        name: data.name,
        code: data.code,
        warehouseType: data.warehouseType,
        address: data.address,
        coordinates: data.coordinates,
        warehouseKeeperId: data.warehouseKeeperId,
        capacity: data.capacity,
        areaSize: data.areaSize,
      },
      include: {
        warehouseKeeper: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async update(id: number, data: UpdateWarehouseDto) {
    const updateData: any = { ...data };
    return (this.prisma as any).warehouse.update({
      where: { id },
      data: updateData,
      include: {
        warehouseKeeper: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async delete(id: number) {
    return (this.prisma as any).warehouse.delete({
      where: { id },
    });
  }

  async count(accountId: number, isActive?: boolean) {
    const where: any = { accountId };
    if (isActive !== undefined) where.isActive = isActive;
    return (this.prisma as any).warehouse.count({ where });
  }

  // Warehouse Stock
  async findStock(warehouseId: number) {
    return (this.prisma as any).warehouseStock.findMany({
      where: { warehouseId },
      include: {
        material: {
          select: { id: true, name: true, code: true, unit: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Warehouse Movements
  async createMovement(data: CreateWarehouseMovementDto) {
    return (this.prisma as any).warehouseMovement.create({
      data: {
        accountId: data.accountId,
        warehouseId: data.warehouseId,
        materialId: data.materialId,
        movementType: data.movementType,
        quantity: data.quantity,
        unit: data.unit,
        fromWarehouseId: data.fromWarehouseId,
        toWarehouseId: data.toWarehouseId,
        supplierOrderId: data.supplierOrderId,
        materialRequestId: data.materialRequestId,
        taskId: data.taskId,
        performedByUserId: data.performedByUserId,
        receivedByUserId: data.receivedByUserId,
        batchNumber: data.batchNumber,
        notes: data.notes,
        documents: data.documents || [],
      },
      include: {
        warehouse: {
          select: { id: true, name: true, code: true },
        },
        material: {
          select: { id: true, name: true, code: true, unit: true },
        },
        fromWarehouse: {
          select: { id: true, name: true, code: true },
        },
        toWarehouse: {
          select: { id: true, name: true, code: true },
        },
        performedBy: {
          select: { id: true, name: true, email: true },
        },
        receivedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  // Inventory Checks
  async findAllInventoryChecks(warehouseId?: number, options?: { skip?: number; take?: number; status?: number }) {
    const where: any = {};
    if (warehouseId !== undefined) where.warehouseId = warehouseId;
    if (options?.status !== undefined) where.status = options.status;

    return (this.prisma as any).inventoryCheck.findMany({
      where,
      include: {
        warehouse: {
          select: { id: true, name: true, code: true },
        },
        performedBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          select: {
            id: true,
            materialId: true,
            expectedQuantity: true,
            actualQuantity: true,
            notes: true,
          },
        },
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findInventoryCheckById(id: number) {
    return (this.prisma as any).inventoryCheck.findFirst({
      where: { id },
      include: {
        warehouse: {
          select: { id: true, name: true, code: true },
        },
        performedBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          select: {
            id: true,
            materialId: true,
            expectedQuantity: true,
            actualQuantity: true,
            notes: true,
          },
        },
      },
    });
  }

  async findInventoryCheckByNumber(checkNumber: string) {
    return (this.prisma as any).inventoryCheck.findFirst({
      where: { checkNumber },
    });
  }

  async createInventoryCheck(data: CreateInventoryCheckDto) {
    const { items, checkDate, ...rest } = data;

    return (this.prisma as any).inventoryCheck.create({
      data: {
        ...rest,
        checkDate: new Date(checkDate),
        items: items && items.length > 0
          ? {
              create: items.map((item) => ({
                materialId: item.materialId,
                expectedQuantity: item.expectedQuantity,
                actualQuantity: item.actualQuantity,
                notes: item.notes,
              })),
            }
          : undefined,
      },
      include: {
        warehouse: {
          select: { id: true, name: true, code: true },
        },
        performedBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          select: {
            id: true,
            materialId: true,
            expectedQuantity: true,
            actualQuantity: true,
            notes: true,
          },
        },
      },
    });
  }

  async updateInventoryCheck(id: number, data: UpdateInventoryCheckDto) {
    const updateData: any = { ...data };
    if (updateData.checkDate) {
      updateData.checkDate = new Date(updateData.checkDate);
    }

    return (this.prisma as any).inventoryCheck.update({
      where: { id },
      data: updateData,
      include: {
        warehouse: {
          select: { id: true, name: true, code: true },
        },
        performedBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          select: {
            id: true,
            materialId: true,
            expectedQuantity: true,
            actualQuantity: true,
            notes: true,
          },
        },
      },
    });
  }

  async countInventoryChecks(warehouseId?: number, status?: number) {
    const where: any = {};
    if (warehouseId !== undefined) where.warehouseId = warehouseId;
    if (status !== undefined) where.status = status;
    return (this.prisma as any).inventoryCheck.count({ where });
  }
}
