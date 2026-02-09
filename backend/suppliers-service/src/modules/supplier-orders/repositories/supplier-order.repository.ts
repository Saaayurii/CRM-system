import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateSupplierOrderDto, UpdateSupplierOrderDto, CreateSupplierOrderItemDto } from '../dto';

@Injectable()
export class SupplierOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: number, options?: { skip?: number; take?: number; status?: number }) {
    const where: any = {
      accountId,
      deletedAt: null,
    };
    if (options?.status !== undefined) {
      where.status = options.status;
    }

    return (this.prisma as any).supplierOrder.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      include: {
        items: true,
        supplier: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    return (this.prisma as any).supplierOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: true,
        supplier: true,
      },
    });
  }

  async create(data: CreateSupplierOrderDto) {
    return (this.prisma as any).supplierOrder.create({
      data: {
        accountId: data.accountId,
        projectId: data.projectId,
        constructionSiteId: data.constructionSiteId,
        supplierId: data.supplierId,
        orderNumber: data.orderNumber,
        orderDate: new Date(data.orderDate),
        createdByUserId: data.createdByUserId,
        approvedByUserId: data.approvedByUserId,
        status: data.status ?? 0,
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
        actualDeliveryDate: data.actualDeliveryDate ? new Date(data.actualDeliveryDate) : undefined,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        deliveryCost: data.deliveryCost,
        totalAmount: data.totalAmount,
        currency: data.currency ?? 'RUB',
        deliveryAddress: data.deliveryAddress,
        deliveryContact: data.deliveryContact,
        deliveryNotes: data.deliveryNotes,
        paymentTerms: data.paymentTerms,
        paymentStatus: data.paymentStatus ?? 0,
        notes: data.notes,
        documents: data.documents ?? [],
      },
      include: {
        items: true,
        supplier: true,
      },
    });
  }

  async update(id: number, data: UpdateSupplierOrderDto) {
    const updateData: any = { ...data };
    if (updateData.orderDate) {
      updateData.orderDate = new Date(updateData.orderDate);
    }
    if (updateData.expectedDeliveryDate) {
      updateData.expectedDeliveryDate = new Date(updateData.expectedDeliveryDate);
    }
    if (updateData.actualDeliveryDate) {
      updateData.actualDeliveryDate = new Date(updateData.actualDeliveryDate);
    }

    return (this.prisma as any).supplierOrder.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        supplier: true,
      },
    });
  }

  async softDelete(id: number) {
    return (this.prisma as any).supplierOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async count(accountId: number, status?: number) {
    const where: any = { accountId, deletedAt: null };
    if (status !== undefined) where.status = status;
    return (this.prisma as any).supplierOrder.count({ where });
  }

  async createItem(supplierOrderId: number, data: CreateSupplierOrderItemDto) {
    return (this.prisma as any).supplierOrderItem.create({
      data: {
        supplierOrderId,
        materialId: data.materialId,
        quantity: data.quantity,
        unit: data.unit,
        unitPrice: data.unitPrice,
        totalPrice: data.totalPrice,
        deliveredQuantity: data.deliveredQuantity ?? 0,
        notes: data.notes,
      },
    });
  }
}
