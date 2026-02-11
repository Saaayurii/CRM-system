import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateTaskTimeLogDto, UpdateTaskTimeLogDto } from '../dto';

@Injectable()
export class TaskTimeLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options?: {
    taskId?: number;
    userId?: number;
    skip?: number;
    take?: number;
  }) {
    const where: any = {};
    if (options?.taskId) where.taskId = Number(options.taskId);
    if (options?.userId) where.userId = Number(options.userId);

    const [data, total] = await Promise.all([
      (this.prisma as any).taskTimeLog.findMany({
        where,
        skip: options?.skip,
        take: options?.take,
        orderBy: { startTime: 'desc' },
      }),
      (this.prisma as any).taskTimeLog.count({ where }),
    ]);

    const page = options?.skip !== undefined && options?.take ? Math.floor(options.skip / options.take) + 1 : 1;
    const limit = options?.take || 20;
    const totalPages = Math.ceil(total / limit);

    return { data, total, page, limit, totalPages };
  }

  async findById(id: number) {
    return (this.prisma as any).taskTimeLog.findUnique({
      where: { id },
    });
  }

  async create(data: CreateTaskTimeLogDto) {
    return (this.prisma as any).taskTimeLog.create({
      data: {
        taskId: data.taskId,
        userId: data.userId,
        startTime: new Date(data.startTime),
        endTime: data.endTime ? new Date(data.endTime) : null,
        durationMinutes: data.durationMinutes,
        description: data.description,
      },
    });
  }

  async update(id: number, data: UpdateTaskTimeLogDto) {
    const updateData: any = { ...data };
    if (data.startTime) updateData.startTime = new Date(data.startTime);
    if (data.endTime) updateData.endTime = new Date(data.endTime);
    return (this.prisma as any).taskTimeLog.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: number) {
    return (this.prisma as any).taskTimeLog.delete({
      where: { id },
    });
  }
}
