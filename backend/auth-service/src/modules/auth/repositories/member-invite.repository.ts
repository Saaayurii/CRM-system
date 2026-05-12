import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class MemberInviteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    accountId: number;
    createdByUserId: number;
    note?: string;
    expiresAt?: Date | null;
  }) {
    const token = randomBytes(32).toString('hex');
    return (this.prisma as any).memberInvite.create({
      data: {
        token,
        accountId: data.accountId,
        createdByUserId: data.createdByUserId,
        note: data.note ?? null,
        expiresAt: data.expiresAt ?? null,
      },
    });
  }

  async findByToken(token: string): Promise<any> {
    const results = await this.prisma.$queryRaw<any[]>`
      SELECT
        mi.id,
        mi.token,
        mi.account_id        AS "accountId",
        mi.created_by_user_id AS "createdByUserId",
        mi.note,
        mi.expires_at        AS "expiresAt",
        mi.used_at           AS "usedAt",
        mi.used_by_user_id   AS "usedByUserId",
        mi.created_at        AS "createdAt",
        a.name               AS "companyName"
      FROM member_invites mi
      JOIN accounts a ON a.id = mi.account_id
      WHERE mi.token = ${token}
    `;
    return results[0] ?? null;
  }

  async findAllByAccount(accountId: number): Promise<any[]> {
    return this.prisma.$queryRaw<any[]>`
      SELECT
        mi.id,
        mi.token,
        mi.account_id        AS "accountId",
        mi.created_by_user_id AS "createdByUserId",
        mi.note,
        mi.expires_at        AS "expiresAt",
        mi.used_at           AS "usedAt",
        mi.used_by_user_id   AS "usedByUserId",
        mi.created_at        AS "createdAt",
        u.name               AS "usedByUserName"
      FROM member_invites mi
      LEFT JOIN users u ON u.id = mi.used_by_user_id
      WHERE mi.account_id = ${accountId}
      ORDER BY mi.created_at DESC
    `;
  }

  async markUsed(token: string) {
    return (this.prisma as any).memberInvite.update({
      where: { token },
      data: { usedAt: new Date() },
    });
  }

  async deleteByTokenAndAccount(token: string, accountId: number) {
    return this.prisma.$executeRaw`
      DELETE FROM member_invites WHERE token = ${token} AND account_id = ${accountId}
    `;
  }
}
