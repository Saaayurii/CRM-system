import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateEventLogDto } from '../dto/create-event-log.dto';

@Injectable()
export class EventLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    accountId: number,
    page: number = 1,
    limit: number = 20,
    entityType?: string,
    userId?: number,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { accountId };
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;
    const [data, total] = await Promise.all([
      (this.prisma as any).eventLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).eventLog.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).eventLog.findFirst({
      where: { id, accountId },
    });
  }

  async create(accountId: number, dto: CreateEventLogDto) {
    return (this.prisma as any).eventLog.create({
      data: { ...dto, accountId },
    });
  }
}
