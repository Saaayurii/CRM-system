import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class RecoveryLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    accountId: number;
    userId: number;
    email: string;
    userName?: string | null;
    roleId?: number | null;
    accountName?: string | null;
    method?: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    return (this.prisma as any).accountRecoveryLog.create({ data });
  }

  /** Recovery events scoped to a single company (account). */
  async findByAccount(accountId: number, take = 200) {
    return (this.prisma as any).accountRecoveryLog.findMany({
      where: { accountId },
      orderBy: { recoveredAt: 'desc' },
      take,
    });
  }
}
