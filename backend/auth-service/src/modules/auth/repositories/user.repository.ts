import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number) {
    return (this.prisma as any).user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  async findByEmail(email: string) {
    return (this.prisma as any).user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async findAllByEmail(email: string) {
    return (this.prisma as any).user.findMany({
      where: { email, deletedAt: null },
      include: { account: { select: { id: true, name: true, settings: true } } },
    });
  }

  async findAllByEmailWithRole(email: string) {
    return (this.prisma as any).user.findMany({
      where: { email, deletedAt: null },
      include: {
        account: { select: { id: true, name: true, settings: true } },
        role: { select: { id: true, name: true, code: true } },
      },
    });
  }

  /**
   * Find active users whose phone matches the given normalized last-10 digits.
   * Stored phones are free-form, so we strip non-digits in SQL and compare the
   * trailing 10 digits (ignores +7 / 8 / spaces / brackets differences).
   */
  async findActiveByPhoneDigits(last10: string) {
    const rows: Array<{ id: number }> = await (this.prisma as any).$queryRaw`
      SELECT id FROM users
      WHERE deleted_at IS NULL
        AND is_active = true
        AND right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 10) = ${last10}
    `;
    const ids = rows.map((r) => Number(r.id));
    if (ids.length === 0) return [];
    return (this.prisma as any).user.findMany({
      where: { id: { in: ids } },
      include: {
        account: { select: { id: true, name: true, settings: true } },
        role: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async findByEmailAndAccount(email: string, accountId: number) {
    return (this.prisma as any).user.findFirst({
      where: { email, accountId, deletedAt: null },
    });
  }

  async findDeletedByEmail(email: string) {
    return (this.prisma as any).user.findFirst({
      where: { email, deletedAt: { not: null } },
    });
  }

  async findDeletedByEmailAndAccount(email: string, accountId: number) {
    return (this.prisma as any).user.findFirst({
      where: { email, accountId, deletedAt: { not: null } },
    });
  }

  async findByIdWithRole(id: number) {
    return (this.prisma as any).user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        role: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });
  }

  async create(data: any) {
    return (this.prisma as any).user.create({
      data,
    });
  }

  async updateRefreshToken(
    userId: number,
    refreshToken: string | null,
    expiresAt: Date | null,
  ) {
    return (this.prisma as any).user.update({
      where: { id: userId },
      data: {
        refreshToken,
        refreshTokenExpiresAt: expiresAt,
      },
    });
  }

  async updateSettings(userId: number, settings: Record<string, unknown>) {
    return (this.prisma as any).user.update({
      where: { id: userId },
      data: { settings },
    });
  }

  async updateSignInInfo(userId: number) {
    return (this.prisma as any).user.update({
      where: { id: userId },
      data: {
        lastSignInAt: new Date(),
        currentSignInAt: new Date(),
        signInCount: {
          increment: 1,
        },
      },
    });
  }

  async updatePassword(userId: number, passwordDigest: string) {
    return (this.prisma as any).user.update({
      where: { id: userId },
      data: {
        passwordDigest,
        mustChangePassword: false,
        refreshToken: null,
        refreshTokenExpiresAt: null,
      },
    });
  }

  async clearAllRefreshTokens(userId: number) {
    return (this.prisma as any).user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
        refreshTokenExpiresAt: null,
      },
    });
  }
}
