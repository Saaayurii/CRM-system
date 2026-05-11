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
    return (this.prisma as any).companyInvite.findMany({
      orderBy: { createdAt: 'desc' },
    });
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
