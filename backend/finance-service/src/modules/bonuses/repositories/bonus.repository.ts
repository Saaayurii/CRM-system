import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateBonusDto } from '../dto/create-bonus.dto';
import { UpdateBonusDto } from '../dto/update-bonus.dto';

@Injectable()
export class BonusRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    accountId: number,
    page: number = 1,
    limit: number = 20,
    filters?: { userId?: number; projectId?: number; status?: number },
  ) {
    const skip = (page - 1) * limit;
    const where: any = { accountId };

    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }
    if (filters?.status !== undefined && filters?.status !== null) {
      where.status = filters.status;
    }

    const [data, total] = await Promise.all([
      (this.prisma as any).bonus.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).bonus.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).bonus.findFirst({
      where: { id, accountId },
    });
  }

  async create(accountId: number, dto: CreateBonusDto) {
    const data: any = { ...dto, accountId };
    if (dto.periodStart) {
      data.periodStart = new Date(dto.periodStart);
    }
    if (dto.periodEnd) {
      data.periodEnd = new Date(dto.periodEnd);
    }
    return (this.prisma as any).bonus.create({ data });
  }

  async update(id: number, accountId: number, dto: UpdateBonusDto) {
    const data: any = { ...dto };
    if (dto.periodStart) {
      data.periodStart = new Date(dto.periodStart);
    }
    if (dto.periodEnd) {
      data.periodEnd = new Date(dto.periodEnd);
    }
    return (this.prisma as any).bonus.updateMany({
      where: { id, accountId },
      data,
    }).then(async () => {
      return (this.prisma as any).bonus.findFirst({ where: { id, accountId } });
    });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).bonus.deleteMany({
      where: { id, accountId },
    });
  }
}
