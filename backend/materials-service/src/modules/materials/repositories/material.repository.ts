import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateMaterialDto, UpdateMaterialDto } from '../dto';

@Injectable()
export class MaterialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    accountId: number,
    options?: {
      skip?: number;
      take?: number;
      categoryId?: number;
      isActive?: boolean;
    },
  ) {
    const where: any = {
      accountId,
      deletedAt: null,
    };
    if (options?.categoryId !== undefined) {
      where.categoryId = options.categoryId;
    }
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    return (this.prisma as any).material.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, code: true },
        },
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    return (this.prisma as any).material.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: {
          select: { id: true, name: true, code: true },
        },
        alternativesFrom: {
          include: {
            alternativeMaterial: {
              select: { id: true, name: true, code: true, unit: true },
            },
          },
        },
      },
    });
  }

  async findByCode(code: string) {
    return (this.prisma as any).material.findFirst({
      where: { code, deletedAt: null },
    });
  }

  async create(data: CreateMaterialDto) {
    return (this.prisma as any).material.create({
      data: {
        accountId: data.accountId,
        categoryId: data.categoryId,
        name: data.name,
        code: data.code,
        description: data.description,
        unit: data.unit,
        manufacturer: data.manufacturer,
        specifications: data.specifications || {},
        basePrice: data.basePrice,
        currency: data.currency || 'RUB',
        minStockLevel: data.minStockLevel,
        maxStockLevel: data.maxStockLevel,
        reorderPoint: data.reorderPoint,
        photos: data.photos || [],
        documents: data.documents || [],
        barcode: data.barcode,
        qrCode: data.qrCode,
      },
      include: {
        category: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async update(id: number, data: UpdateMaterialDto) {
    const updateData: any = { ...data };
    return (this.prisma as any).material.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async softDelete(id: number) {
    return (this.prisma as any).material.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async count(accountId: number, categoryId?: number) {
    const where: any = { accountId, deletedAt: null };
    if (categoryId !== undefined) where.categoryId = categoryId;
    return (this.prisma as any).material.count({ where });
  }

  // Material Categories
  async findAllCategories(
    accountId: number,
    options?: { skip?: number; take?: number },
  ) {
    return (this.prisma as any).materialCategory.findMany({
      where: { accountId },
      include: {
        parentCategory: {
          select: { id: true, name: true, code: true },
        },
        childCategories: {
          select: { id: true, name: true, code: true },
        },
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findCategoryById(id: number) {
    return (this.prisma as any).materialCategory.findFirst({
      where: { id },
      include: {
        parentCategory: {
          select: { id: true, name: true, code: true },
        },
        childCategories: {
          select: { id: true, name: true, code: true },
        },
        materials: {
          where: { deletedAt: null },
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async createCategory(data: any) {
    return (this.prisma as any).materialCategory.create({
      data: {
        accountId: data.accountId,
        parentCategoryId: data.parentCategoryId,
        name: data.name,
        code: data.code,
        description: data.description,
        icon: data.icon,
        sortOrder: data.sortOrder || 0,
      },
      include: {
        parentCategory: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async updateCategory(id: number, data: any) {
    return (this.prisma as any).materialCategory.update({
      where: { id },
      data,
      include: {
        parentCategory: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async deleteCategory(id: number) {
    return (this.prisma as any).materialCategory.delete({
      where: { id },
    });
  }

  async countCategories(accountId: number) {
    return (this.prisma as any).materialCategory.count({
      where: { accountId },
    });
  }

  // Material Alternatives
  async addAlternative(
    materialId: number,
    alternativeMaterialId: number,
    notes?: string,
  ) {
    return (this.prisma as any).materialAlternative.create({
      data: {
        materialId,
        alternativeMaterialId,
        notes,
      },
      include: {
        alternativeMaterial: {
          select: { id: true, name: true, code: true, unit: true },
        },
      },
    });
  }

  async removeAlternative(id: number) {
    return (this.prisma as any).materialAlternative.delete({
      where: { id },
    });
  }
}
