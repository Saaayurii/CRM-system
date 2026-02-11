import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class EquipmentMaintenanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    accountId: number,
    page: number,
    limit: number,
    equipmentId?: number,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { equipment: { accountId } };
    if (equipmentId !== undefined) where.equipmentId = equipmentId;

    const [data, total] = await Promise.all([
      (this.prisma as any).equipmentMaintenance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { maintenanceDate: 'desc' },
        include: { equipment: true },
      }),
      (this.prisma as any).equipmentMaintenance.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).equipmentMaintenance.findFirst({
      where: { id, equipment: { accountId } },
      include: { equipment: true },
    });
  }

  async create(data: any) {
    return (this.prisma as any).equipmentMaintenance.create({
      data,
      include: { equipment: true },
    });
  }

  async update(id: number, accountId: number, data: any) {
    return (this.prisma as any).equipmentMaintenance.updateMany({
      where: { id, equipment: { accountId } },
      data,
    });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).equipmentMaintenance.deleteMany({
      where: { id, equipment: { accountId } },
    });
  }
}
