import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: number;
    refreshToken: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return (this.prisma as any).userSession.create({ data });
  }

  async findByRefreshToken(refreshToken: string) {
    return (this.prisma as any).userSession.findFirst({
      where: { refreshToken },
    });
  }

  async findAllByUserId(userId: number) {
    return (this.prisma as any).userSession.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  /** Delete oldest sessions so the user has at most `max` sessions total */
  async enforceLimit(userId: number, max = 5): Promise<void> {
    const sessions = await (this.prisma as any).userSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (sessions.length >= max) {
      const toDelete = sessions.slice(max - 1).map((s: any) => s.id);
      await (this.prisma as any).userSession.deleteMany({
        where: { id: { in: toDelete } },
      });
    }
  }

  async updateToken(id: number, refreshToken: string, expiresAt: Date) {
    return (this.prisma as any).userSession.update({
      where: { id },
      data: { refreshToken, expiresAt, lastSeenAt: new Date() },
    });
  }

  async deleteById(id: number) {
    return (this.prisma as any).userSession.delete({ where: { id } });
  }

  async deleteByIdAndUserId(id: number, userId: number) {
    return (this.prisma as any).userSession.deleteMany({
      where: { id, userId },
    });
  }

  async deleteAllByUserId(userId: number) {
    return (this.prisma as any).userSession.deleteMany({ where: { userId } });
  }
}
