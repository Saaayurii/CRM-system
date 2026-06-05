import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class PhoneResetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    phone: string;
    codeHash: string;
    expiresAt: Date;
    ipAddress?: string;
  }) {
    return (this.prisma as any).phoneResetCode.create({ data });
  }

  /** Latest still-active (unused, not expired) code for a phone. */
  async findActiveByPhone(phone: string) {
    return (this.prisma as any).phoneResetCode.findFirst({
      where: {
        phone,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async incrementAttempts(id: number) {
    return (this.prisma as any).phoneResetCode.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  async markUsed(id: number) {
    return (this.prisma as any).phoneResetCode.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  /** Invalidate any still-active codes for a phone before issuing a new one. */
  async invalidateAllForPhone(phone: string) {
    return (this.prisma as any).phoneResetCode.updateMany({
      where: { phone, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
