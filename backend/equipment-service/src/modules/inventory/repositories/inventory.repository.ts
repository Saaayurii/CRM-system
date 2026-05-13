import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma as any;
  }

  async findAll(accountId: number, projectId?: number) {
    const where: any = { accountId };
    if (projectId !== undefined) where.projectId = projectId;
    return this.db.inventorySession.findMany({
      where,
      include: {
        items: {
          include: {
            equipment: { select: { id: true, name: true, serialNumber: true, status: true } },
            warehouse: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number, accountId: number) {
    return this.db.inventorySession.findFirst({
      where: { id, accountId },
      include: {
        items: {
          include: {
            equipment: { select: { id: true, name: true, serialNumber: true, status: true, equipmentType: true } },
            warehouse: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async create(accountId: number, createdByUserId: number, data: any) {
    const { items, scheduledDate, completedDate, ...sessionData } = data;
    return this.db.inventorySession.create({
      data: {
        ...sessionData,
        accountId,
        createdByUserId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        completedDate: completedDate ? new Date(completedDate) : undefined,
        items: items?.length
          ? { create: items }
          : undefined,
      },
      include: {
        items: {
          include: {
            equipment: { select: { id: true, name: true, serialNumber: true } },
            warehouse: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async update(id: number, accountId: number, data: any) {
    const { items, scheduledDate, completedDate, ...sessionData } = data;
    const updateData: any = { ...sessionData };
    if (scheduledDate) updateData.scheduledDate = new Date(scheduledDate);
    if (completedDate) updateData.completedDate = new Date(completedDate);
    return this.db.inventorySession.updateMany({ where: { id, accountId }, data: updateData });
  }

  async delete(id: number, accountId: number) {
    return this.db.inventorySession.deleteMany({ where: { id, accountId } });
  }

  async addItem(sessionId: number, item: any) {
    return this.db.inventoryItem.create({
      data: { ...item, inventorySessionId: sessionId },
      include: {
        equipment: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
      },
    });
  }

  async deleteItem(itemId: number) {
    return this.db.inventoryItem.delete({ where: { id: itemId } });
  }
}
