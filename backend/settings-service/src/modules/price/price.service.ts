import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreatePriceProjectCategoryDto,
  UpdatePriceProjectCategoryDto,
} from './dto/upsert-price-project-category.dto';
import {
  CreatePriceCategoryDto,
  UpdatePriceCategoryDto,
} from './dto/upsert-price-category.dto';
import {
  CreatePriceItemDto,
  UpdatePriceItemDto,
  PriceItemPriceInput,
} from './dto/upsert-price-item.dto';

@Injectable()
export class PriceService {
  constructor(private readonly prisma: PrismaService) {}

  /* ── Project categories (= колонки цен) ── */

  listProjectCategories(accountId: number) {
    return (this.prisma as any).priceProjectCategory.findMany({
      where: { accountId },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  createProjectCategory(accountId: number, dto: CreatePriceProjectCategoryDto) {
    return (this.prisma as any).priceProjectCategory.create({
      data: { ...dto, accountId },
    });
  }

  async updateProjectCategory(
    accountId: number,
    id: number,
    dto: UpdatePriceProjectCategoryDto,
  ) {
    await this.findOwned('priceProjectCategory', accountId, id);
    return (this.prisma as any).priceProjectCategory.update({
      where: { id },
      data: dto,
    });
  }

  async removeProjectCategory(accountId: number, id: number) {
    await this.findOwned('priceProjectCategory', accountId, id);
    await (this.prisma as any).priceProjectCategory.delete({ where: { id } });
    return { id };
  }

  /* ── Price categories ── */

  listCategories(accountId: number) {
    return (this.prisma as any).priceCategory.findMany({
      where: { accountId },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  createCategory(accountId: number, dto: CreatePriceCategoryDto) {
    return (this.prisma as any).priceCategory.create({
      data: { ...this.normalize(dto), accountId },
    });
  }

  async updateCategory(accountId: number, id: number, dto: UpdatePriceCategoryDto) {
    await this.findOwned('priceCategory', accountId, id);
    return (this.prisma as any).priceCategory.update({
      where: { id },
      data: this.normalize(dto),
    });
  }

  async removeCategory(accountId: number, id: number) {
    await this.findOwned('priceCategory', accountId, id);
    await (this.prisma as any).priceCategory.delete({ where: { id } });
    return { id };
  }

  /* ── Price items + цены + модификаторы ── */

  listItems(accountId: number, params: { categoryId?: number; rootOnly?: boolean } = {}) {
    const where: any = { accountId };
    if (params.categoryId !== undefined) where.categoryId = params.categoryId;
    if (params.rootOnly) where.parentId = null;
    return (this.prisma as any).priceItem.findMany({
      where,
      include: { prices: true, modifiers: { include: { prices: true } } },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async getItem(accountId: number, id: number) {
    const item = await (this.prisma as any).priceItem.findFirst({
      where: { id, accountId },
      include: { prices: true, modifiers: { include: { prices: true } } },
    });
    if (!item) throw new NotFoundException('Price item not found');
    return item;
  }

  async createItem(accountId: number, dto: CreatePriceItemDto) {
    if (dto.parentId) await this.ensureItemOwned(accountId, dto.parentId);
    if (dto.categoryId) await this.findOwned('priceCategory', accountId, dto.categoryId);
    const { prices, ...rest } = dto;
    return this.prisma.$transaction(async (tx: any) => {
      const item = await tx.priceItem.create({
        data: { ...this.normalize(rest), accountId },
      });
      if (prices?.length) {
        await this.replacePricesTx(tx, accountId, item.id, prices);
      }
      return tx.priceItem.findUnique({
        where: { id: item.id },
        include: { prices: true, modifiers: { include: { prices: true } } },
      });
    });
  }

  async updateItem(accountId: number, id: number, dto: UpdatePriceItemDto) {
    await this.ensureItemOwned(accountId, id);
    if (dto.parentId) {
      if (dto.parentId === id) throw new BadRequestException('parentId cannot equal id');
      await this.ensureItemOwned(accountId, dto.parentId);
    }
    if (dto.categoryId) await this.findOwned('priceCategory', accountId, dto.categoryId);
    const { prices, ...rest } = dto;
    return this.prisma.$transaction(async (tx: any) => {
      await tx.priceItem.update({
        where: { id },
        data: this.normalize(rest),
      });
      if (prices) {
        await this.replacePricesTx(tx, accountId, id, prices);
      }
      return tx.priceItem.findUnique({
        where: { id },
        include: { prices: true, modifiers: { include: { prices: true } } },
      });
    });
  }

  async removeItem(accountId: number, id: number) {
    await this.ensureItemOwned(accountId, id);
    await (this.prisma as any).priceItem.delete({ where: { id } });
    return { id };
  }

  /* ── Агрегированная выборка для UI ── */

  async getPriceList(accountId: number) {
    const [projectCategories, categories, items] = await Promise.all([
      this.listProjectCategories(accountId),
      this.listCategories(accountId),
      (this.prisma as any).priceItem.findMany({
        where: { accountId, parentId: null },
        include: { prices: true, modifiers: { include: { prices: true } } },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
    ]);
    return { projectCategories, categories, items };
  }

  /* ── helpers ── */

  private async replacePricesTx(
    tx: any,
    accountId: number,
    itemId: number,
    prices: PriceItemPriceInput[],
  ) {
    if (prices.length) {
      const ownedCategoryIds = await tx.priceProjectCategory.findMany({
        where: { accountId, id: { in: prices.map((p) => p.projectCategoryId) } },
        select: { id: true },
      });
      const allowed = new Set(ownedCategoryIds.map((c: any) => c.id));
      for (const p of prices) {
        if (!allowed.has(p.projectCategoryId)) {
          throw new BadRequestException(
            `Project category #${p.projectCategoryId} is not available`,
          );
        }
      }
    }
    await tx.priceItemPrice.deleteMany({ where: { itemId } });
    if (prices.length) {
      await tx.priceItemPrice.createMany({
        data: prices.map((p) => ({
          itemId,
          projectCategoryId: p.projectCategoryId,
          price: p.price,
        })),
      });
    }
  }

  private async findOwned(model: string, accountId: number, id: number) {
    const row = await (this.prisma as any)[model].findFirst({ where: { id, accountId } });
    if (!row) throw new NotFoundException(`${model} #${id} not found`);
    return row;
  }

  private ensureItemOwned(accountId: number, id: number) {
    return this.findOwned('priceItem', accountId, id);
  }

  private normalize<T extends Record<string, any>>(dto: T): T {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(dto)) {
      if (v === undefined) continue;
      out[k] = v === '' ? null : v;
    }
    return out as T;
  }
}
