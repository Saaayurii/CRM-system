import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from '../dto';

@Injectable()
export class TaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    accountId: number,
    options?: {
      skip?: number;
      take?: number;
      projectId?: number;
      status?: number;
      assignedToUserId?: number;
    },
  ) {
    const where: any = { accountId, deletedAt: null };
    if (options?.projectId) where.projectId = options.projectId;
    if (options?.status !== undefined) where.status = options.status;
    if (options?.assignedToUserId)
      where.assignedToUserId = options.assignedToUserId;

    return (this.prisma as any).task.findMany({
      where,
      include: {
        subTasks: { where: { deletedAt: null } },
        assignees: true,
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });
  }

  async findById(id: number) {
    return (this.prisma as any).task.findFirst({
      where: { id, deletedAt: null },
      include: {
        subTasks: { where: { deletedAt: null } },
        parentTask: true,
        assignees: true,
      },
    });
  }

  async findByProject(projectId: number, accountId: number) {
    return (this.prisma as any).task.findMany({
      where: { projectId, accountId, deletedAt: null, parentTaskId: null },
      include: { subTasks: { where: { deletedAt: null } } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(data: CreateTaskDto, createdByUserId: number) {
    return (this.prisma as any).task.create({
      data: {
        accountId: data.accountId,
        projectId: data.projectId,
        parentTaskId: data.parentTaskId,
        title: data.title,
        description: data.description,
        taskType: data.taskType,
        assignedToUserId: data.assignedToUserId,
        createdByUserId,
        priority: data.priority || 2,
        startDate: data.startDate ? new Date(data.startDate) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        estimatedHours: data.estimatedHours,
        locationDescription: data.locationDescription,
        tags: data.tags || [],
      },
    });
  }

  async update(id: number, data: UpdateTaskDto) {
    const updateData: any = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate);

    // Auto-set actual dates based on status
    if (data.status === 1 && !updateData.actualStartDate) {
      updateData.actualStartDate = new Date();
    }
    if (data.status === 3) {
      updateData.actualEndDate = new Date();
      updateData.progressPercentage = 100;
    }

    return (this.prisma as any).task.update({
      where: { id },
      data: updateData,
    });
  }

  async softDelete(id: number) {
    return (this.prisma as any).task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async count(
    accountId: number,
    options?: { projectId?: number; status?: number },
  ) {
    const where: any = { accountId, deletedAt: null };
    if (options?.projectId) where.projectId = options.projectId;
    if (options?.status !== undefined) where.status = options.status;
    return (this.prisma as any).task.count({ where });
  }

  async setAssignees(
    taskId: number,
    assignees: { userId: number; userName?: string }[],
  ) {
    // Replace all assignees atomically
    await (this.prisma as any).$transaction([
      (this.prisma as any).taskAssignee.deleteMany({ where: { taskId } }),
      ...(assignees.length > 0
        ? [
            (this.prisma as any).taskAssignee.createMany({
              data: assignees.map((a) => ({
                taskId,
                userId: a.userId,
                userName: a.userName ?? null,
              })),
            }),
          ]
        : []),
    ]);
    return (this.prisma as any).taskAssignee.findMany({ where: { taskId } });
  }

  async getAssignees(taskId: number) {
    return (this.prisma as any).taskAssignee.findMany({ where: { taskId } });
  }

  async getStats(accountId: number, projectId?: number) {
    const where: any = { accountId, deletedAt: null };
    if (projectId) where.projectId = projectId;

    const [total, newTasks, inProgress, completed] = await Promise.all([
      (this.prisma as any).task.count({ where }),
      (this.prisma as any).task.count({ where: { ...where, status: 0 } }),
      (this.prisma as any).task.count({ where: { ...where, status: 1 } }),
      (this.prisma as any).task.count({ where: { ...where, status: 3 } }),
    ]);

    return { total, new: newTasks, inProgress, completed };
  }
}
