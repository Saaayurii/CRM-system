import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NormBookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  private get model() {
    return (this.prisma as any).normBookmark;
  }

  async list(userId: number) {
    const marks = await this.model.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        document: {
          select: {
            id: true,
            code: true,
            title: true,
            docType: true,
            status: true,
            categoryId: true,
          },
        },
      },
    });
    return marks.map((m: any) => m.document).filter(Boolean);
  }

  async add(userId: number, documentId: number) {
    await this.model.upsert({
      where: { userId_documentId: { userId, documentId } },
      create: { userId, documentId },
      update: {},
    });
    return { documentId, isBookmarked: true };
  }

  async remove(userId: number, documentId: number) {
    await this.model
      .delete({ where: { userId_documentId: { userId, documentId } } })
      .catch(() => undefined);
    return { documentId, isBookmarked: false };
  }
}
