import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number) {
    return (this.prisma as any).account.findFirst({
      where: { id, status: 1 },
    });
  }

  async findAll() {
    return (this.prisma as any).account.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true } } },
    });
  }

  async create(data: { name: string; logoUrl?: string; subdomain?: string }) {
    return (this.prisma as any).account.create({
      data: {
        name: data.name,
        status: 1,
        settings: data.logoUrl ? { logoUrl: data.logoUrl } : {},
        subdomain: data.subdomain || null,
      },
    });
  }

  async update(id: number, data: { status?: number; name?: string }) {
    return (this.prisma as any).account.update({
      where: { id },
      data,
    });
  }
}
