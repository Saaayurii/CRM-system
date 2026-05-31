import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateNormCategoryDto,
  UpdateNormCategoryDto,
} from './dto/norm-category.dto';

@Injectable()
export class NormCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private get model() {
    return (this.prisma as any).normCategory;
  }

  /** Flat list of all categories with document counts, ordered for tree-building. */
  async findAll() {
    const [categories, counts] = await Promise.all([
      this.model.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      (this.prisma as any).normDocument.groupBy({
        by: ['categoryId'],
        _count: { _all: true },
      }),
    ]);
    const countMap = new Map<number, number>();
    for (const c of counts as any[]) {
      if (c.categoryId != null) countMap.set(c.categoryId, c._count._all);
    }
    return categories.map((c: any) => ({
      ...c,
      documentCount: countMap.get(c.id) ?? 0,
    }));
  }

  async findById(id: number) {
    const c = await this.model.findUnique({ where: { id } });
    if (!c) throw new NotFoundException(`Norm category #${id} not found`);
    return c;
  }

  async create(dto: CreateNormCategoryDto) {
    return this.model.create({ data: { ...dto } });
  }

  async update(id: number, dto: UpdateNormCategoryDto) {
    await this.findById(id);
    return this.model.update({ where: { id }, data: { ...dto } });
  }

  async remove(id: number) {
    await this.findById(id);
    // Re-parent children to this category's parent, detach documents.
    const cat = await this.model.findUnique({ where: { id } });
    await this.model.updateMany({
      where: { parentId: id },
      data: { parentId: cat?.parentId ?? null },
    });
    await (this.prisma as any).normDocument.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });
    return this.model.delete({ where: { id } });
  }
}
