import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class ClientInviteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    accountId: number;
    createdByUserId: number;
    projectId?: number;
    note?: string;
    expiresAt?: Date | null;
    canViewProgress?: boolean;
    canViewPhotos?: boolean;
    canViewDocuments?: boolean;
    canViewFinancials?: boolean;
  }) {
    const token = randomBytes(32).toString('hex');
    return (this.prisma as any).clientInvite.create({
      data: {
        token,
        accountId: data.accountId,
        createdByUserId: data.createdByUserId,
        projectId: data.projectId ?? null,
        note: data.note ?? null,
        expiresAt: data.expiresAt ?? null,
        canViewProgress: data.canViewProgress ?? true,
        canViewPhotos: data.canViewPhotos ?? true,
        canViewDocuments: data.canViewDocuments ?? false,
        canViewFinancials: data.canViewFinancials ?? false,
      },
    });
  }

  async findByToken(token: string): Promise<any> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        ci.id,
        ci.token,
        ci.account_id           AS "accountId",
        ci.project_id           AS "projectId",
        ci.created_by_user_id   AS "createdByUserId",
        ci.note,
        ci.can_view_progress    AS "canViewProgress",
        ci.can_view_photos      AS "canViewPhotos",
        ci.can_view_documents   AS "canViewDocuments",
        ci.can_view_financials  AS "canViewFinancials",
        ci.expires_at           AS "expiresAt",
        ci.used_at              AS "usedAt",
        ci.used_by_client_id    AS "usedByClientId",
        ci.used_by_user_id      AS "usedByUserId",
        ci.created_at           AS "createdAt",
        a.name                  AS "companyName",
        p.name                  AS "projectName"
      FROM client_invites ci
      JOIN accounts a ON a.id = ci.account_id
      LEFT JOIN projects p ON p.id = ci.project_id
      WHERE ci.token = ${token}
    `;
    return rows[0] ?? null;
  }

  async findAllByAccount(accountId: number): Promise<any[]> {
    return this.prisma.$queryRaw<any[]>`
      SELECT
        ci.id,
        ci.token,
        ci.account_id          AS "accountId",
        ci.project_id          AS "projectId",
        ci.created_by_user_id  AS "createdByUserId",
        ci.note,
        ci.can_view_progress   AS "canViewProgress",
        ci.can_view_photos     AS "canViewPhotos",
        ci.can_view_documents  AS "canViewDocuments",
        ci.can_view_financials AS "canViewFinancials",
        ci.expires_at          AS "expiresAt",
        ci.used_at             AS "usedAt",
        ci.used_by_client_id   AS "usedByClientId",
        ci.used_by_user_id     AS "usedByUserId",
        ci.created_at          AS "createdAt",
        p.name                 AS "projectName",
        c.company_name         AS "usedByCompanyName",
        TRIM(CONCAT(COALESCE(c.last_name, ''), ' ', COALESCE(c.first_name, ''))) AS "usedByPersonName"
      FROM client_invites ci
      LEFT JOIN projects p ON p.id = ci.project_id
      LEFT JOIN clients c ON c.id = ci.used_by_client_id
      WHERE ci.account_id = ${accountId}
      ORDER BY ci.created_at DESC
    `;
  }

  async markUsed(token: string, clientId: number, userId: number) {
    return (this.prisma as any).clientInvite.update({
      where: { token },
      data: {
        usedAt: new Date(),
        usedByClientId: clientId,
        usedByUserId: userId,
      },
    });
  }

  async deleteByTokenAndAccount(token: string, accountId: number) {
    return this.prisma.$executeRaw`
      DELETE FROM client_invites WHERE token = ${token} AND account_id = ${accountId}
    `;
  }
}
