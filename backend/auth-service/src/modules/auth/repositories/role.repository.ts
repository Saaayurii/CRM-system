import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number) {
    return (this.prisma as any).role.findUnique({
      where: { id },
    });
  }

  async findByCode(code: string) {
    return (this.prisma as any).role.findUnique({
      where: { code },
    });
  }

  async findAll() {
    return (this.prisma as any).role.findMany({
      orderBy: { id: 'asc' },
    });
  }
}
