import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class SystemSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}
  async findByAccountId(accountId: number) {
    return (this.prisma as any).account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        name: true,
        subdomain: true,
        settings: true,
        status: true,
      },
    });
  }
  async update(accountId: number, data: any) {
    return (this.prisma as any).account.update({
      where: { id: accountId },
      data,
      select: {
        id: true,
        name: true,
        subdomain: true,
        settings: true,
        status: true,
      },
    });
  }
}
