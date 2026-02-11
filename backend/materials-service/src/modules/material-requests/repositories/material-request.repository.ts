import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateMaterialRequestDto,
  UpdateMaterialRequestDto,
  CreateMaterialRequestItemDto,
} from '../dto';

@Injectable()
export class MaterialRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    accountId: number,
    options?: { skip?: number; take?: number; status?: number },
  ) {
    const where: any = { accountId };
    if (options?.status !== undefined) {
      where.status = options.status;
    }

    return (this.prisma as any).materialRequest.findMany({
      where,
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            material: {
              select: { id: true, name: true, code: true, unit: true },
            },
          },
        },
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    return (this.prisma as any).materialRequest.findFirst({
      where: { id },
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            material: {
              select: { id: true, name: true, code: true, unit: true },
            },
          },
        },
      },
    });
  }

  async findByRequestNumber(requestNumber: string) {
    return (this.prisma as any).materialRequest.findFirst({
      where: { requestNumber },
    });
  }

  async create(data: CreateMaterialRequestDto) {
    const { items, requestDate, neededByDate, ...rest } = data;

    return (this.prisma as any).materialRequest.create({
      data: {
        ...rest,
        requestDate: new Date(requestDate),
        neededByDate: neededByDate ? new Date(neededByDate) : undefined,
        items:
          items && items.length > 0
            ? {
                create: items.map((item) => ({
                  materialId: item.materialId,
                  requestedQuantity: item.requestedQuantity,
                  approvedQuantity: item.approvedQuantity,
                  unit: item.unit,
                  notes: item.notes,
                })),
              }
            : undefined,
      },
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            material: {
              select: { id: true, name: true, code: true, unit: true },
            },
          },
        },
      },
    });
  }

  async update(id: number, data: UpdateMaterialRequestDto) {
    const updateData: any = { ...data };
    if (updateData.neededByDate) {
      updateData.neededByDate = new Date(updateData.neededByDate);
    }
    if (updateData.approvedDate) {
      updateData.approvedDate = new Date(updateData.approvedDate);
    }

    return (this.prisma as any).materialRequest.update({
      where: { id },
      data: updateData,
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            material: {
              select: { id: true, name: true, code: true, unit: true },
            },
          },
        },
      },
    });
  }

  async delete(id: number) {
    return (this.prisma as any).materialRequest.delete({
      where: { id },
    });
  }

  async count(accountId: number, status?: number) {
    const where: any = { accountId };
    if (status !== undefined) where.status = status;
    return (this.prisma as any).materialRequest.count({ where });
  }

  // Material Request Items
  async addItem(materialRequestId: number, data: CreateMaterialRequestItemDto) {
    return (this.prisma as any).materialRequestItem.create({
      data: {
        materialRequestId,
        materialId: data.materialId,
        requestedQuantity: data.requestedQuantity,
        approvedQuantity: data.approvedQuantity,
        unit: data.unit,
        notes: data.notes,
      },
      include: {
        material: {
          select: { id: true, name: true, code: true, unit: true },
        },
      },
    });
  }
}
