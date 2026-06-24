import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ShareLinkRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(accountId: number, entityType?: string, entityId?: number) {
    const where: any = { accountId, revokedAt: null };
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    return (this.prisma as any).shareLink.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: number, accountId: number) {
    return (this.prisma as any).shareLink.findFirst({ where: { id, accountId } });
  }

  // Поиск по публичному токену (без accountId — токен и есть авторизация).
  findByToken(token: string) {
    return (this.prisma as any).shareLink.findUnique({ where: { token } });
  }

  create(accountId: number, data: any) {
    return (this.prisma as any).shareLink.create({
      data: { ...data, accountId },
    });
  }

  revoke(id: number, accountId: number) {
    return (this.prisma as any).shareLink.updateMany({
      where: { id, accountId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // Инкремент счётчика просмотров по токену.
  markViewed(id: number) {
    return (this.prisma as any).shareLink.update({
      where: { id },
      data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
    });
  }
}
