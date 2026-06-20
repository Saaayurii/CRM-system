import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class PasswordResetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    email: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
  }) {
    return (this.prisma as any).passwordResetToken.create({ data });
  }

  /** A token is valid when it exists, was not used and has not expired. */
  async findValidByHash(tokenHash: string) {
    return (this.prisma as any).passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async markUsed(id: number) {
    return (this.prisma as any).passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  /** Invalidate any still-active tokens for an email before issuing a new one. */
  async invalidateAllForEmail(email: string) {
    return (this.prisma as any).passwordResetToken.updateMany({
      where: { email, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  /**
   * Housekeeping: drop tokens that can no longer be used — expired ones and
   * those already consumed. Returns the number of rows removed.
   */
  async deleteSpent(): Promise<number> {
    const res = await (this.prisma as any).passwordResetToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
      },
    });
    return res.count ?? 0;
  }
}
