import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateWikiDraftDto,
  UpdateWikiDraftDto,
  ReviewWikiDraftDto,
  AddDraftCommentDto,
} from './dto/wiki-draft.dto';

const ADMIN_ROLES = [1, 2, 3]; // super_admin, admin, hr_manager

@Injectable()
export class WikiDraftsService {
  constructor(private readonly prisma: PrismaService) {}

  async listDrafts(accountId: number, userId: number, roleId: number, status?: string) {
    const where: any = { accountId };
    if (status) where.status = status;
    if (!ADMIN_ROLES.includes(roleId)) where.authorId = userId;

    const drafts = await (this.prisma as any).wikiPageDraft.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        page: { select: { id: true, title: true } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
    });
    return drafts;
  }

  async getDraft(id: number, accountId: number, userId: number, roleId: number) {
    const draft = await (this.prisma as any).wikiPageDraft.findFirst({
      where: { id, accountId },
      include: {
        page: { select: { id: true, title: true, version: true } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!draft) throw new NotFoundException(`Draft #${id} not found`);
    if (!ADMIN_ROLES.includes(roleId) && draft.authorId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return draft;
  }

  async createDraft(accountId: number, userId: number, dto: CreateWikiDraftDto) {
    return (this.prisma as any).wikiPageDraft.create({
      data: {
        accountId,
        authorId: userId,
        wikiPageId: dto.wikiPageId ?? null,
        title: dto.title,
        category: dto.category ?? null,
        parentPageId: dto.parentPageId ?? null,
        tags: dto.tags ?? [],
        blocks: dto.blocks,
        status: 'draft',
      },
    });
  }

  async updateDraft(id: number, accountId: number, userId: number, roleId: number, dto: UpdateWikiDraftDto) {
    const draft = await this.getDraft(id, accountId, userId, roleId);
    if (draft.status === 'approved') throw new BadRequestException('Cannot edit approved draft');

    return (this.prisma as any).wikiPageDraft.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.parentPageId !== undefined && { parentPageId: dto.parentPageId }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.blocks !== undefined && { blocks: dto.blocks }),
      },
    });
  }

  async submitForReview(id: number, accountId: number, userId: number, roleId: number) {
    const draft = await this.getDraft(id, accountId, userId, roleId);
    if (draft.status !== 'draft') throw new BadRequestException('Only drafts can be submitted for review');

    return (this.prisma as any).wikiPageDraft.update({
      where: { id },
      data: { status: 'pending' },
    });
  }

  async reviewDraft(id: number, accountId: number, reviewerId: number, roleId: number, dto: ReviewWikiDraftDto) {
    if (!ADMIN_ROLES.includes(roleId)) throw new ForbiddenException('Only admins can review drafts');

    const draft = await (this.prisma as any).wikiPageDraft.findFirst({
      where: { id, accountId },
    });
    if (!draft) throw new NotFoundException(`Draft #${id} not found`);
    if (draft.status !== 'pending') throw new BadRequestException('Only pending drafts can be reviewed');

    const updated = await (this.prisma as any).wikiPageDraft.update({
      where: { id },
      data: {
        status: dto.action,
        reviewerId,
        reviewNote: dto.reviewNote ?? null,
      },
    });

    if (dto.action === 'approved') {
      await this.publishDraft(draft, reviewerId);
    }

    return updated;
  }

  private async publishDraft(draft: any, publisherId: number) {
    const { title, blocks, category, parentPageId, tags, wikiPageId, accountId } = draft;

    if (wikiPageId) {
      const page = await (this.prisma as any).wikiPage.findFirst({ where: { id: wikiPageId, accountId } });
      if (!page) return;

      const nextVersion = (page.version || 1) + 1;
      await (this.prisma as any).wikiPageVersion.create({
        data: {
          wikiPageId,
          versionNum: nextVersion,
          title: page.title,
          blocks: page.blocks ?? [],
          changeNote: `Версия ${page.version} → ${nextVersion}`,
          createdByUserId: publisherId,
        },
      });

      await (this.prisma as any).wikiPage.update({
        where: { id: wikiPageId },
        data: { title, blocks, category, parentPageId, tags, version: nextVersion, updatedByUserId: publisherId },
      });
    } else {
      await (this.prisma as any).wikiPage.create({
        data: {
          accountId,
          title,
          blocks,
          category,
          parentPageId,
          tags,
          version: 1,
          createdByUserId: publisherId,
          updatedByUserId: publisherId,
        },
      });
    }
  }

  async deleteDraft(id: number, accountId: number, userId: number, roleId: number) {
    const draft = await this.getDraft(id, accountId, userId, roleId);
    if (draft.status === 'approved') throw new BadRequestException('Cannot delete approved draft');

    return (this.prisma as any).wikiPageDraft.delete({ where: { id } });
  }

  async addComment(id: number, accountId: number, userId: number, roleId: number, dto: AddDraftCommentDto) {
    await this.getDraft(id, accountId, userId, roleId);

    return (this.prisma as any).wikiDraftComment.create({
      data: { draftId: id, userId, text: dto.text },
    });
  }

  // Admin: publish page directly (bypasses moderation)
  async publishPageDirect(pageId: number | null, accountId: number, userId: number, roleId: number, data: {
    title: string; blocks: any[]; category?: string; parentPageId?: number; tags?: any[]; changeNote?: string;
  }) {
    if (!ADMIN_ROLES.includes(roleId)) throw new ForbiddenException('Only admins can publish directly');

    if (pageId) {
      const page = await (this.prisma as any).wikiPage.findFirst({ where: { id: pageId, accountId } });
      if (!page) throw new NotFoundException(`Page #${pageId} not found`);

      const nextVersion = (page.version || 1) + 1;
      await (this.prisma as any).wikiPageVersion.create({
        data: {
          wikiPageId: pageId,
          versionNum: nextVersion,
          title: page.title,
          blocks: page.blocks ?? [],
          changeNote: data.changeNote ?? null,
          createdByUserId: userId,
        },
      });

      return (this.prisma as any).wikiPage.update({
        where: { id: pageId },
        data: {
          title: data.title,
          blocks: data.blocks,
          category: data.category ?? page.category,
          parentPageId: data.parentPageId ?? page.parentPageId,
          tags: data.tags ?? page.tags,
          version: nextVersion,
          updatedByUserId: userId,
        },
      });
    } else {
      return (this.prisma as any).wikiPage.create({
        data: {
          accountId,
          title: data.title,
          blocks: data.blocks,
          category: data.category ?? null,
          parentPageId: data.parentPageId ?? null,
          tags: data.tags ?? [],
          version: 1,
          createdByUserId: userId,
          updatedByUserId: userId,
        },
      });
    }
  }
}
