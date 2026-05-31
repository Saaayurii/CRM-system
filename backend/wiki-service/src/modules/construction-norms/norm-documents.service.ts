import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateNormDocumentDto,
  UpdateNormDocumentDto,
} from './dto/norm-document.dto';

interface FindAllParams {
  page: number;
  limit: number;
  categoryId?: number;
  docType?: string;
  status?: string;
  tag?: string;
  q?: string;
  userId?: number;
}

@Injectable()
export class NormDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  private get model() {
    return (this.prisma as any).normDocument;
  }

  private toDate(v?: string) {
    return v ? new Date(v) : undefined;
  }

  async findAll(params: FindAllParams) {
    const { page, limit, categoryId, docType, status, tag, q, userId } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (docType) where.docType = docType;
    if (status) where.status = status;
    if (tag) where.tags = { array_contains: tag };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
        { keywords: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ updatedAt: 'desc' }],
        select: {
          id: true,
          categoryId: true,
          docType: true,
          code: true,
          title: true,
          summary: true,
          status: true,
          effectiveDate: true,
          supersededDate: true,
          tags: true,
          viewCount: true,
          updatedAt: true,
          category: { select: { id: true, name: true } },
        },
      }),
      this.model.count({ where }),
    ]);

    let bookmarkedIds = new Set<number>();
    if (userId && data.length) {
      const marks = await (this.prisma as any).normBookmark.findMany({
        where: { userId, documentId: { in: data.map((d: any) => d.id) } },
        select: { documentId: true },
      });
      bookmarkedIds = new Set(marks.map((m: any) => m.documentId));
    }

    return {
      data: data.map((d: any) => ({
        ...d,
        isBookmarked: bookmarkedIds.has(d.id),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: number, userId?: number, incrementView = false) {
    const doc = await this.model.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, parentId: true } },
        supersededBy: { select: { id: true, code: true, title: true } },
        supersedes: { select: { id: true, code: true, title: true } },
      },
    });
    if (!doc) throw new NotFoundException(`Norm document #${id} not found`);

    if (incrementView) {
      this.model
        .update({ where: { id }, data: { viewCount: { increment: 1 } } })
        .catch(() => undefined);
      doc.viewCount += 1;
    }

    // Resolve related documents (relatedIds is a JSON array of ids).
    let related: any[] = [];
    const relIds = Array.isArray(doc.relatedIds) ? doc.relatedIds : [];
    if (relIds.length) {
      related = await this.model.findMany({
        where: { id: { in: relIds.filter((x: any) => Number.isInteger(x)) } },
        select: { id: true, code: true, title: true, docType: true, status: true },
      });
    }

    let isBookmarked = false;
    if (userId) {
      const mark = await (this.prisma as any).normBookmark.findUnique({
        where: { userId_documentId: { userId, documentId: id } },
      });
      isBookmarked = !!mark;
    }

    return { ...doc, related, isBookmarked };
  }

  async create(userId: number, dto: CreateNormDocumentDto) {
    const { effectiveDate, supersededDate, ...rest } = dto;
    return this.model.create({
      data: {
        ...rest,
        effectiveDate: this.toDate(effectiveDate),
        supersededDate: this.toDate(supersededDate),
        createdByUserId: userId,
        updatedByUserId: userId,
      },
    });
  }

  async update(id: number, userId: number, dto: UpdateNormDocumentDto) {
    await this.findById(id);
    const { effectiveDate, supersededDate, ...rest } = dto;
    const data: any = { ...rest, updatedByUserId: userId };
    if (effectiveDate !== undefined) data.effectiveDate = this.toDate(effectiveDate);
    if (supersededDate !== undefined)
      data.supersededDate = this.toDate(supersededDate);
    return this.model.update({ where: { id }, data });
  }

  async remove(id: number) {
    await this.findById(id);
    return this.model.delete({ where: { id } });
  }

  /** Lightweight stats for the module header. */
  async stats() {
    const [total, active, superseded, byType] = await Promise.all([
      this.model.count(),
      this.model.count({ where: { status: 'active' } }),
      this.model.count({ where: { status: 'superseded' } }),
      this.model.groupBy({ by: ['docType'], _count: { _all: true } }),
    ]);
    const types: Record<string, number> = {};
    for (const t of byType as any[]) types[t.docType] = t._count._all;
    return { total, active, superseded, byType: types };
  }
}
