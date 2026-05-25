import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ImportPriceListDto } from './dto/import-price-list.dto';

interface ImportError {
  row: number;
  message: string;
}

export interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: ImportError[];
  createdCategories: string[];
  createdProjectCategories: string[];
  dryRun: boolean;
}

@Injectable()
export class PriceImportService {
  constructor(private readonly prisma: PrismaService) {}

  async run(accountId: number, dto: ImportPriceListDto): Promise<ImportResult> {
    const dryRun = !!dto.dryRun;
    const createMissingCats = dto.createMissingCategories ?? true;
    const createMissingPCs = dto.createMissingProjectCategories ?? false;

    const result: ImportResult = {
      total: dto.rows.length,
      created: 0,
      skipped: 0,
      errors: [],
      createdCategories: [],
      createdProjectCategories: [],
      dryRun,
    };

    if (dto.rows.length === 0) return result;

    const prisma = this.prisma as unknown as {
      priceCategory: {
        findMany: (a: object) => Promise<{ id: number; name: string }[]>;
        create: (a: object) => Promise<{ id: number; name: string }>;
      };
      priceProjectCategory: {
        findMany: (a: object) => Promise<{ id: number; name: string }[]>;
        create: (a: object) => Promise<{ id: number; name: string }>;
      };
      priceItem: {
        create: (a: object) => Promise<{ id: number }>;
      };
      priceItemPrice: {
        createMany: (a: object) => Promise<unknown>;
      };
    };

    const [existingCats, existingPCs] = await Promise.all([
      prisma.priceCategory.findMany({ where: { accountId } }),
      prisma.priceProjectCategory.findMany({ where: { accountId } }),
    ]);
    const catByName = new Map<string, number>(existingCats.map((c) => [c.name.trim().toLowerCase(), c.id]));
    const pcByName = new Map<string, number>(existingPCs.map((p) => [p.name.trim().toLowerCase(), p.id]));

    const ensureCategory = async (name: string | undefined): Promise<number | null> => {
      if (!name || !name.trim()) return null;
      const key = name.trim().toLowerCase();
      const cached = catByName.get(key);
      if (cached) return cached;
      if (!createMissingCats) return null;
      if (dryRun) {
        catByName.set(key, -1);
        if (!result.createdCategories.includes(name.trim())) result.createdCategories.push(name.trim());
        return -1;
      }
      const created = await prisma.priceCategory.create({
        data: { accountId, name: name.trim() },
      });
      catByName.set(key, created.id);
      result.createdCategories.push(created.name);
      return created.id;
    };

    const ensureProjectCategory = async (name: string): Promise<number | null> => {
      const key = name.trim().toLowerCase();
      const cached = pcByName.get(key);
      if (cached) return cached;
      if (!createMissingPCs) return null;
      if (dryRun) {
        pcByName.set(key, -1);
        if (!result.createdProjectCategories.includes(name.trim())) result.createdProjectCategories.push(name.trim());
        return -1;
      }
      const created = await prisma.priceProjectCategory.create({
        data: { accountId, name: name.trim() },
      });
      pcByName.set(key, created.id);
      result.createdProjectCategories.push(created.name);
      return created.id;
    };

    let rowNum = 0;
    for (const row of dto.rows) {
      rowNum++;
      try {
        if (!row.name || !row.name.trim()) {
          result.errors.push({ row: rowNum, message: 'Пустое название' });
          result.skipped++;
          continue;
        }

        const categoryId = await ensureCategory(row.categoryName);
        const priceEntries: { projectCategoryId: number; price: number }[] = [];
        if (row.prices?.length) {
          for (const p of row.prices) {
            const pcId = await ensureProjectCategory(p.projectCategoryName);
            if (!pcId) {
              result.errors.push({
                row: rowNum,
                message: `Колонка цены «${p.projectCategoryName}» не найдена — добавьте её в управлении колонками цен`,
              });
              continue;
            }
            if (pcId > 0) priceEntries.push({ projectCategoryId: pcId, price: p.price });
          }
        }

        if (dryRun) {
          result.created++;
          continue;
        }

        const item = await prisma.priceItem.create({
          data: {
            accountId,
            categoryId: categoryId && categoryId > 0 ? categoryId : null,
            name: row.name.trim(),
            description: row.description?.trim() || null,
            unit: row.unit?.trim() || null,
            cost: row.cost ?? null,
          },
        });
        if (priceEntries.length) {
          await prisma.priceItemPrice.createMany({
            data: priceEntries.map((p) => ({ itemId: item.id, ...p })),
          });
        }
        result.created++;
      } catch (err) {
        const message = (err as { message?: string }).message ?? 'Ошибка сохранения';
        result.errors.push({ row: rowNum, message });
        result.skipped++;
      }
    }

    return result;
  }
}
