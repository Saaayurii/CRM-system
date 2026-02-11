import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateTaskCommentDto, UpdateTaskCommentDto } from '../dto';

@Injectable()
export class TaskCommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options?: {
    taskId?: number;
    skip?: number;
    take?: number;
  }) {
    const where: any = {};
    if (options?.taskId) where.taskId = Number(options.taskId);

    const [data, total] = await Promise.all([
      (this.prisma as any).taskComment.findMany({
        where,
        skip: options?.skip,
        take: options?.take,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).taskComment.count({ where }),
    ]);

    const page = options?.skip !== undefined && options?.take ? Math.floor(options.skip / options.take) + 1 : 1;
    const limit = options?.take || 20;
    const totalPages = Math.ceil(total / limit);

    return { data, total, page, limit, totalPages };
  }

  async findById(id: number) {
    return (this.prisma as any).taskComment.findUnique({
      where: { id },
    });
  }

  async create(data: CreateTaskCommentDto) {
    return (this.prisma as any).taskComment.create({
      data: {
        taskId: data.taskId,
        userId: data.userId,
        commentText: data.commentText,
        attachments: data.attachments || [],
      },
    });
  }

  async update(id: number, data: UpdateTaskCommentDto) {
    return (this.prisma as any).taskComment.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return (this.prisma as any).taskComment.delete({
      where: { id },
    });
  }
}
