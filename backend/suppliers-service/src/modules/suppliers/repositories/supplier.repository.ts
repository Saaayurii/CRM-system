import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  CreateSupplierMaterialDto,
} from '../dto';

@Injectable()
export class SupplierRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    accountId: number,
    options?: { skip?: number; take?: number; status?: number },
  ) {
    const where: any = {
      accountId,
      deletedAt: null,
    };
    if (options?.status !== undefined) {
      where.status = options.status;
    }

    return (this.prisma as any).supplier.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    return (this.prisma as any).supplier.findFirst({
      where: { id, deletedAt: null },
      include: {
        supplierMaterials: {
          include: {
            priceHistory: {
              orderBy: { validFrom: 'desc' },
              take: 5,
            },
          },
        },
      },
    });
  }

  async create(data: CreateSupplierDto) {
    return (this.prisma as any).supplier.create({
      data: {
        accountId: data.accountId,
        name: data.name,
        legalName: data.legalName,
        inn: data.inn,
        kpp: data.kpp,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email,
        website: data.website,
        legalAddress: data.legalAddress,
        warehouseAddress: data.warehouseAddress,
        paymentTerms: data.paymentTerms,
        deliveryTimeDays: data.deliveryTimeDays,
        minOrderAmount: data.minOrderAmount,
        rating: data.rating,
        reliabilityScore: data.reliabilityScore,
        status: data.status ?? 1,
        isVerified: data.isVerified ?? false,
        notes: data.notes,
        documents: data.documents ?? [],
      },
    });
  }

  async update(id: number, data: UpdateSupplierDto) {
    const updateData: any = { ...data };
    return (this.prisma as any).supplier.update({
      where: { id },
      data: updateData,
    });
  }

  async softDelete(id: number) {
    return (this.prisma as any).supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async count(accountId: number, status?: number) {
    const where: any = { accountId, deletedAt: null };
    if (status !== undefined) where.status = status;
    return (this.prisma as any).supplier.count({ where });
  }

  // Supplier Materials
  async findMaterials(supplierId: number) {
    return (this.prisma as any).supplierMaterial.findMany({
      where: { supplierId },
      include: {
        priceHistory: {
          orderBy: { validFrom: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMaterial(supplierId: number, data: CreateSupplierMaterialDto) {
    const material = await (this.prisma as any).supplierMaterial.create({
      data: {
        supplierId,
        materialId: data.materialId,
        supplierCode: data.supplierCode,
        price: data.price,
        currency: data.currency ?? 'RUB',
        minOrderQuantity: data.minOrderQuantity,
        deliveryTimeDays: data.deliveryTimeDays,
        isAvailable: data.isAvailable ?? true,
      },
    });

    // Create initial price history record
    if (data.price) {
      await (this.prisma as any).supplierPriceHistory.create({
        data: {
          supplierMaterialId: material.id,
          price: data.price,
          validFrom: new Date(),
        },
      });
    }

    return material;
  }
}
