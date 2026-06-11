import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskCommentRepository } from './repositories/task-comment.repository';
import { NotificationsClientService } from './notifications-client.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateTaskCommentDto, UpdateTaskCommentDto } from './dto';

@Injectable()
export class TaskCommentsService {
  constructor(
    private readonly taskCommentRepository: TaskCommentRepository,
    private readonly notificationsClient: NotificationsClientService,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(
    page: number = 1,
    limit: number = 20,
    filters?: { taskId?: number },
  ) {
    const skip = (page - 1) * limit;
    return this.taskCommentRepository.findAll({
      skip,
      take: limit,
      taskId: filters?.taskId,
    });
  }

  async findById(id: number) {
    const comment = await this.taskCommentRepository.findById(id);
    if (!comment) throw new NotFoundException('Task comment not found');
    return comment;
  }

  async create(createDto: CreateTaskCommentDto, accountId?: number) {
    const comment = await this.taskCommentRepository.create(createDto);

    // Notify task creator + assignee about the new comment
    if (accountId && createDto.taskId && createDto.userId) {
      try {
        const task = await (this.prisma as any).task.findUnique({
          where: { id: createDto.taskId },
          select: {
            title: true,
            createdByUserId: true,
            assignedToUserId: true,
            accountId: true,
          },
        });
        if (task) {
          const recipients = new Set<number>();
          if (task.createdByUserId) recipients.add(task.createdByUserId);
          if (task.assignedToUserId) recipients.add(task.assignedToUserId);
          recipients.delete(createDto.userId); // don't notify the commenter

          const payloads = Array.from(recipients).map((userId) => ({
            userId,
            accountId: task.accountId ?? accountId,
            title: `Новый комментарий к задаче: ${task.title}`,
            message: createDto.commentText?.slice(0, 150) || 'Добавлен новый комментарий',
            notificationType: 'task_commented',
            priority: 2 as const,
            channels: ['in_app', 'push'],
            actionUrl: `/dashboard/tasks?edit=${createDto.taskId}`,
            entityType: 'task',
            entityId: createDto.taskId,
          }));

          this.notificationsClient.sendToMany(payloads);
        }
      } catch { /* skip notification on error */ }
    }

    return comment;
  }

  async update(id: number, updateDto: UpdateTaskCommentDto) {
    const comment = await this.taskCommentRepository.findById(id);
    if (!comment) throw new NotFoundException('Task comment not found');
    return this.taskCommentRepository.update(id, updateDto);
  }

  async remove(id: number): Promise<void> {
    const comment = await this.taskCommentRepository.findById(id);
    if (!comment) throw new NotFoundException('Task comment not found');
    await this.taskCommentRepository.delete(id);
  }
}
