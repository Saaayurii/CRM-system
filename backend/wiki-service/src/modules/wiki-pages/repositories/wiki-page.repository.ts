import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateWikiPageDto } from '../dto/create-wiki-page.dto';
import { UpdateWikiPageDto } from '../dto/update-wiki-page.dto';

@Injectable()
export class WikiPageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    accountId: number,
    page: number = 1,
    limit: number = 20,
    category?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { accountId };
    if (category) where.category = category;
    const [data, total] = await Promise.all([
      (this.prisma as any).wikiPage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      (this.prisma as any).wikiPage.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).wikiPage.findFirst({
      where: { id, accountId },
    });
  }

  async create(accountId: number, userId: number, dto: CreateWikiPageDto) {
    return (this.prisma as any).wikiPage.create({
      data: {
        ...dto,
        accountId,
        createdByUserId: userId,
        updatedByUserId: userId,
      },
    });
  }

  async update(
    id: number,
    accountId: number,
    userId: number,
    dto: UpdateWikiPageDto,
  ) {
    await (this.prisma as any).wikiPage.updateMany({
      where: { id, accountId },
      data: { ...dto, updatedByUserId: userId },
    });
    return (this.prisma as any).wikiPage.findFirst({
      where: { id, accountId },
    });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).wikiPage.deleteMany({
      where: { id, accountId },
    });
  }
}
