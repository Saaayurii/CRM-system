import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateWikiPageDto } from '../dto/create-wiki-page.dto';
import { UpdateWikiPageDto } from '../dto/update-wiki-page.dto';

@Injectable()
export class WikiPageRepository {
  constructor(readonly prisma: PrismaService) {}

  async findAll(accountId: number, page = 1, limit = 20, category?: string, q?: string) {
    const skip = (page - 1) * limit;
    const where: any = { accountId };
    if (category) where.category = category;
    if (q) where.title = { contains: q, mode: 'insensitive' };
    const [data, total] = await Promise.all([
      (this.prisma as any).wikiPage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true, title: true, category: true, parentPageId: true,
          tags: true, version: true, viewCount: true, isPublic: true,
          createdByUserId: true, updatedByUserId: true,
          createdAt: true, updatedAt: true,
        },
      }),
      (this.prisma as any).wikiPage.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findTree(accountId: number) {
    return (this.prisma as any).wikiPage.findMany({
      where: { accountId },
      orderBy: [{ parentPageId: 'asc' }, { title: 'asc' }],
      select: {
        id: true, title: true, parentPageId: true, category: true,
        version: true, updatedAt: true,
      },
    });
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).wikiPage.findFirst({
      where: { id, accountId },
      include: {
        parentPage: { select: { id: true, title: true } },
        childPages: { select: { id: true, title: true } },
      },
    });
  }

  async create(accountId: number, userId: number, dto: CreateWikiPageDto) {
    return (this.prisma as any).wikiPage.create({
      data: { ...dto, accountId, createdByUserId: userId, updatedByUserId: userId },
    });
  }

  async update(id: number, accountId: number, userId: number, dto: UpdateWikiPageDto) {
    await (this.prisma as any).wikiPage.updateMany({
      where: { id, accountId },
      data: { ...dto, updatedByUserId: userId },
    });
    return (this.prisma as any).wikiPage.findFirst({ where: { id, accountId } });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).wikiPage.deleteMany({ where: { id, accountId } });
  }

  async getVersions(wikiPageId: number) {
    return (this.prisma as any).wikiPageVersion.findMany({
      where: { wikiPageId },
      orderBy: { versionNum: 'desc' },
    });
  }

  async getVersion(wikiPageId: number, versionNum: number) {
    return (this.prisma as any).wikiPageVersion.findUnique({
      where: { wikiPageId_versionNum: { wikiPageId, versionNum } },
    });
  }
}
