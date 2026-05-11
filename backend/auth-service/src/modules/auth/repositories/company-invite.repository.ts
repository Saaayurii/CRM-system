import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class CompanyInviteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    token: string;
    createdBy: number;
    note?: string;
    expiresAt?: Date | null;
  }) {
    return (this.prisma as any).companyInvite.create({ data });
  }

  async findByToken(token: string) {
    return (this.prisma as any).companyInvite.findUnique({ where: { token } });
  }

  async findAll() {
    return this.prisma.$queryRaw`
      SELECT
        ci.id,
        ci.token,
        ci.created_by AS "createdBy",
        ci.note,
        ci.expires_at AS "expiresAt",
        ci.used_at AS "usedAt",
        ci.used_by_account_id AS "usedByAccountId",
        ci.created_at AS "createdAt",
        a.name AS "usedByAccountName"
      FROM company_invites ci
      LEFT JOIN accounts a ON a.id = ci.used_by_account_id
      ORDER BY ci.created_at DESC
    `;
  }

  async markUsed(token: string, accountId: number) {
    return (this.prisma as any).companyInvite.update({
      where: { token },
      data: { usedAt: new Date(), usedByAccountId: accountId },
    });
  }

  async delete(token: string) {
    return (this.prisma as any).companyInvite.delete({ where: { token } });
  }
}
