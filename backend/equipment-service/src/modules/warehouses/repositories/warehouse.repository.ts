import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class WarehouseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: number) {
    return (this.prisma as any).warehouse.findMany({
      where: { accountId },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            equipmentType: true,
            serialNumber: true,
            status: true,
            manufacturer: true,
            purchaseDate: true,
            currentLocation: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).warehouse.findFirst({
      where: { id, accountId },
      include: {
        equipment: true,
      },
    });
  }

  async create(data: { name: string; address?: string; accountId: number }) {
    return (this.prisma as any).warehouse.create({ data });
  }

  async update(id: number, accountId: number, data: { name?: string; address?: string }) {
    return (this.prisma as any).warehouse.updateMany({
      where: { id, accountId },
      data,
    });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).warehouse.deleteMany({
      where: { id, accountId },
    });
  }
}
