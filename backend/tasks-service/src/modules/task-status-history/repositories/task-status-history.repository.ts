import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateTaskStatusHistoryDto } from '../dto';

@Injectable()
export class TaskStatusHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options?: { taskId?: number; skip?: number; take?: number }) {
    const where: any = {};
    if (options?.taskId) where.taskId = Number(options.taskId);

    const [data, total] = await Promise.all([
      (this.prisma as any).taskStatusHistory.findMany({
        where,
        skip: options?.skip,
        take: options?.take,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).taskStatusHistory.count({ where }),
    ]);

    const page =
      options?.skip !== undefined && options?.take
        ? Math.floor(options.skip / options.take) + 1
        : 1;
    const limit = options?.take || 20;
    const totalPages = Math.ceil(total / limit);

    return { data, total, page, limit, totalPages };
  }

  async findById(id: number) {
    return (this.prisma as any).taskStatusHistory.findUnique({
      where: { id },
    });
  }

  async create(data: CreateTaskStatusHistoryDto) {
    return (this.prisma as any).taskStatusHistory.create({
      data: {
        taskId: data.taskId,
        changedByUserId: data.changedByUserId,
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
        changeReason: data.changeReason,
      },
    });
  }
}
