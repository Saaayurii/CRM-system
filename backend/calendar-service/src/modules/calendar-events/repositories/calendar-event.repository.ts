import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class CalendarEventRepository {
  private readonly logger = new Logger(CalendarEventRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    accountId: number,
    page: number = 1,
    limit: number = 20,
    filters?: {
      projectId?: number;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: any = { accountId };

    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }
    if (filters?.startDate || filters?.endDate) {
      where.startDatetime = {};
      if (filters.startDate) {
        where.startDatetime.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.startDatetime.lte = new Date(filters.endDate);
      }
    }

    const [data, total] = await Promise.all([
      (this.prisma as any).calendarEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDatetime: 'asc' },
      }),
      (this.prisma as any).calendarEvent.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).calendarEvent.findFirst({
      where: { id, accountId },
    });
  }

  async create(data: any) {
    return (this.prisma as any).calendarEvent.create({ data });
  }

  async update(id: number, accountId: number, data: any) {
    return (this.prisma as any).calendarEvent.updateMany({
      where: { id, accountId },
      data,
    });
  }

  async delete(id: number, accountId: number) {
    return (this.prisma as any).calendarEvent.deleteMany({
      where: { id, accountId },
    });
  }
}
