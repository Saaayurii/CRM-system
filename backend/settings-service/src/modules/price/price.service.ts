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
  PriceItemParamGroupInput,
} from './dto/upsert-price-item.dto';
import { CreatePriceUnitDto, UpdatePriceUnitDto } from './dto/upsert-price-unit.dto';

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
      include: {
        prices: true,
        modifiers: { include: { prices: true } },
        paramGroups: {
          include: { options: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async getItem(accountId: number, id: number) {
    const item = await (this.prisma as any).priceItem.findFirst({
      where: { id, accountId },
      include: {
        prices: true,
        modifiers: { include: { prices: true } },
        paramGroups: {
          include: { options: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!item) throw new NotFoundException('Price item not found');
    return item;
  }

  async createItem(accountId: number, dto: CreatePriceItemDto) {
    if (dto.parentId) await this.ensureItemOwned(accountId, dto.parentId);
    if (dto.categoryId) await this.findOwned('priceCategory', accountId, dto.categoryId);
    const { prices, paramGroups, ...rest } = dto;
    return this.prisma.$transaction(async (tx: any) => {
      const item = await tx.priceItem.create({
        data: { ...this.normalize(rest), accountId },
      });
      if (prices?.length) {
        await this.replacePricesTx(tx, accountId, item.id, prices);
      }
      if (paramGroups) {
        await this.replaceParamGroupsTx(tx, item.id, paramGroups);
      }
      return tx.priceItem.findUnique({
        where: { id: item.id },
        include: {
        prices: true,
        modifiers: { include: { prices: true } },
        paramGroups: {
          include: { options: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
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
    const { prices, paramGroups, ...rest } = dto;
    return this.prisma.$transaction(async (tx: any) => {
      await tx.priceItem.update({
        where: { id },
        data: this.normalize(rest),
      });
      if (prices) {
        await this.replacePricesTx(tx, accountId, id, prices);
      }
      if (paramGroups) {
        await this.replaceParamGroupsTx(tx, id, paramGroups);
      }
      return tx.priceItem.findUnique({
        where: { id },
        include: {
        prices: true,
        modifiers: { include: { prices: true } },
        paramGroups: {
          include: { options: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
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
        include: {
        prices: true,
        modifiers: { include: { prices: true } },
        paramGroups: {
          include: { options: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
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

  /** Полностью пересоздаёт группы параметров услуги и их варианты. */
  private async replaceParamGroupsTx(
    tx: any,
    itemId: number,
    groups: PriceItemParamGroupInput[],
  ) {
    // onDelete: Cascade на options → достаточно удалить группы.
    await tx.priceItemParamGroup.deleteMany({ where: { itemId } });
    for (const [gi, g] of groups.entries()) {
      const group = await tx.priceItemParamGroup.create({
        data: {
          itemId,
          sourceParameterId: g.sourceParameterId ?? null,
          name: g.name,
          selectionType: g.selectionType ?? 'single',
          isRequired: g.isRequired ?? true,
          affectsPrice: g.affectsPrice ?? true,
          sortOrder: g.sortOrder ?? gi,
        },
      });
      const options = g.options ?? [];
      if (options.length) {
        await tx.priceItemParamOption.createMany({
          data: options.map((o, oi) => ({
            groupId: group.id,
            name: o.name,
            influenceType: o.influenceType ?? 'coefficient',
            influenceValue: o.influenceValue ?? 1,
            sortOrder: o.sortOrder ?? oi,
          })),
        });
      }
    }
  }

  /* ── Единицы измерения ── */

  listUnits(accountId: number) {
    return (this.prisma as any).priceUnit.findMany({
      where: { accountId },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  createUnit(accountId: number, dto: CreatePriceUnitDto) {
    return (this.prisma as any).priceUnit.create({
      data: { ...this.normalize(dto), accountId },
    });
  }

  async updateUnit(accountId: number, id: number, dto: UpdatePriceUnitDto) {
    await this.findOwned('priceUnit', accountId, id);
    return (this.prisma as any).priceUnit.update({
      where: { id },
      data: this.normalize(dto),
    });
  }

  async removeUnit(accountId: number, id: number) {
    await this.findOwned('priceUnit', accountId, id);
    await (this.prisma as any).priceUnit.delete({ where: { id } });
    return { id };
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
