import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TaskRepository } from './repositories/task.repository';
import { NotificationsClientService } from './notifications-client.service';
import { CreateTaskDto, UpdateTaskDto } from './dto';
import { PrismaService } from '../../database/prisma.service';
import {
  CLIENT_ROLE_ID,
  RequestUser,
  getClientAllowedProjectIds,
} from '../../common/helpers/client-access.helper';

// Admins (super_admin, admin) + project managers — get a feed of significant activity
const ADMIN_PM_ROLES = [1, 2, 4];

@Injectable()
export class TasksService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly notificationsClient: NotificationsClientService,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(
    user: RequestUser,
    page: number = 1,
    limit: number = 20,
    filters?: {
      projectId?: number;
      status?: number;
      assignedToUserId?: number;
      constructionSiteId?: number;
    },
  ) {
    const skip = (page - 1) * limit;
    const allowedProjectIds = await getClientAllowedProjectIds(this.prisma, user);
    const [tasks, total] = await Promise.all([
      this.taskRepository.findAll(user.accountId, {
        skip,
        take: limit,
        ...filters,
        allowedProjectIds,
      }),
      this.taskRepository.count(user.accountId, { ...filters, allowedProjectIds }),
    ]);

    return { tasks, total, page, limit };
  }

  async findById(id: number, user: RequestUser) {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    if (task.accountId !== user.accountId)
      throw new ForbiddenException('Access denied');
    if (user.roleId === CLIENT_ROLE_ID) {
      const allowed = await getClientAllowedProjectIds(this.prisma, user);
      if (!allowed?.includes(task.projectId)) {
        throw new ForbiddenException('Access denied');
      }
    }
    return task;
  }

  async findByProject(projectId: number, user: RequestUser) {
    if (user.roleId === CLIENT_ROLE_ID) {
      const allowed = await getClientAllowedProjectIds(this.prisma, user);
      if (!allowed?.includes(projectId)) {
        throw new ForbiddenException('Access denied');
      }
    }
    return this.taskRepository.findByProject(projectId, user.accountId);
  }

  async create(
    createTaskDto: CreateTaskDto,
    requestingUserId: number,
    requestingUserAccountId: number,
  ) {
    const task = await this.taskRepository.create(
      { ...createTaskDto, accountId: requestingUserAccountId },
      requestingUserId,
    );

    // Notify the direct assignee (if set and different from creator)
    const assigneeId = createTaskDto.assignedToUserId;
    if (assigneeId && assigneeId !== requestingUserId) {
      const projectName = task.project?.name ? ` (${task.project.name})` : '';
      this.notificationsClient.sendToMany([{
        userId: assigneeId,
        accountId: requestingUserAccountId,
        title: `Вам назначена задача: ${task.title}`,
        message: createTaskDto.description
          ? createTaskDto.description.slice(0, 150)
          : `Новая задача${projectName}`,
        notificationType: 'task_assigned',
        priority: task.priority >= 3 ? 3 : 2,
        channels: ['in_app', 'push'],
        actionUrl: `/dashboard/tasks?edit=${task.id}`,
        entityType: 'task',
        entityId: task.id,
      }]);
    }

    // Notify admins/PMs about the new task/subtask (excluding the creator)
    const isSubtask = !!createTaskDto.parentTaskId;
    void this.notificationsClient.broadcast({
      accountId: requestingUserAccountId,
      roleIds: ADMIN_PM_ROLES,
      excludeUserId: requestingUserId,
      title: `${isSubtask ? 'Создана подзадача' : 'Создана задача'}: ${task.title}`,
      message: task.project?.name ? `Проект: ${task.project.name}` : undefined,
      notificationType: 'task_created',
      priority: 2,
      channels: ['in_app'],
      actionUrl: `/dashboard/tasks?edit=${task.id}`,
      entityType: 'task',
      entityId: task.id,
    });

    return task;
  }

  async update(
    id: number,
    updateTaskDto: UpdateTaskDto,
    requestingUserAccountId: number,
    requestingUserId?: number,
  ) {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    if (task.accountId !== requestingUserAccountId)
      throw new ForbiddenException('Access denied');

    // Semantic domain event: emit `task.status_changed` (with from→to) in the
    // SAME transaction as the write — richer + atomic vs the gateway's flat
    // `task.update`. Automation rules can trigger on it. See OutboxService.
    const statusChanged =
      updateTaskDto.status !== undefined && updateTaskDto.status !== task.status;
    const outboxEvent = statusChanged
      ? {
          accountId: requestingUserAccountId,
          entityType: 'task',
          entityId: id,
          action: 'status_changed',
          userId: requestingUserId,
          description: `Статус задачи «${task.title}» изменён`,
          changes: { status: { from: task.status, to: updateTaskDto.status } },
          projectId: task.projectId,
        }
      : undefined;

    const updated = await this.taskRepository.update(id, updateTaskDto, outboxEvent);

    // Notify admins/PMs on any status change (excluding the actor)
    if (updateTaskDto.status !== undefined && updateTaskDto.status !== task.status) {
      const TASK_STATUS_LABEL: Record<number, string> = {
        0: 'новая',
        1: 'в работе',
        2: 'на проверке',
        3: 'выполнена',
        4: 'просрочена',
        5: 'отменена',
      };
      const label = TASK_STATUS_LABEL[updateTaskDto.status] ?? `статус ${updateTaskDto.status}`;
      void this.notificationsClient.broadcast({
        accountId: requestingUserAccountId,
        roleIds: ADMIN_PM_ROLES,
        excludeUserId: requestingUserId,
        title: `Задача «${task.title}» — ${label}`,
        notificationType: 'task_status_changed',
        priority: 1,
        channels: ['in_app'],
        actionUrl: `/dashboard/tasks?edit=${id}`,
        entityType: 'task',
        entityId: id,
      });
    }

    // Notify when status changes to "completed" (status === 3)
    if (updateTaskDto.status === 3 && task.createdByUserId) {
      this.notificationsClient.sendToMany([{
        userId: task.createdByUserId,
        accountId: requestingUserAccountId,
        title: `Задача выполнена: ${task.title}`,
        message: 'Задача помечена как выполненная',
        notificationType: 'task_completed',
        priority: 2,
        channels: ['in_app', 'push'],
        actionUrl: `/dashboard/tasks?edit=${id}`,
        entityType: 'task',
        entityId: id,
      }]);
    }

    // Notify when task becomes overdue (status === 4)
    if (updateTaskDto.status === 4) {
      const assigneeId = updated.assignedToUserId ?? task.assignedToUserId;
      if (assigneeId) {
        this.notificationsClient.sendToMany([{
          userId: assigneeId,
          accountId: requestingUserAccountId,
          title: `Задача просрочена: ${task.title}`,
          message: 'Срок выполнения задачи истёк',
          notificationType: 'task_overdue',
          priority: 3,
          channels: ['in_app', 'push'],
          actionUrl: `/dashboard/tasks?edit=${id}`,
          entityType: 'task',
          entityId: id,
        }]);
      }
    }

    // Notify assignee when priority or dueDate changes (task_updated)
    const priorityChanged = updateTaskDto.priority !== undefined && updateTaskDto.priority !== task.priority;
    const dueDateChanged = updateTaskDto.dueDate !== undefined;
    if ((priorityChanged || dueDateChanged) && updateTaskDto.status !== 3 && updateTaskDto.status !== 4) {
      const assigneeId = updated.assignedToUserId ?? task.assignedToUserId;
      if (assigneeId && assigneeId !== requestingUserId) {
        const changeNote = priorityChanged ? 'Изменён приоритет задачи' : 'Изменён срок выполнения задачи';
        this.notificationsClient.sendToMany([{
          userId: assigneeId,
          accountId: requestingUserAccountId,
          title: `Задача обновлена: ${task.title}`,
          message: changeNote,
          notificationType: 'task_updated',
          priority: 2,
          channels: ['in_app'],
          actionUrl: `/dashboard/tasks?edit=${id}`,
          entityType: 'task',
          entityId: id,
        }]);
      }

      // Warn if deadline is within 24 hours
      if (dueDateChanged && updateTaskDto.dueDate) {
        const deadline = new Date(updateTaskDto.dueDate);
        const hoursLeft = (deadline.getTime() - Date.now()) / 3600000;
        if (hoursLeft > 0 && hoursLeft <= 24 && assigneeId) {
          this.notificationsClient.sendToMany([{
            userId: assigneeId,
            accountId: requestingUserAccountId,
            title: `Дедлайн задачи через ${Math.ceil(hoursLeft)} ч.: ${task.title}`,
            message: 'Срок выполнения задачи скоро истекает',
            notificationType: 'task_deadline',
            priority: 3,
            channels: ['in_app', 'push'],
            actionUrl: `/dashboard/tasks?edit=${id}`,
            entityType: 'task',
            entityId: id,
          }]);
        }
      }
    }

    return updated;
  }

  async remove(
    id: number,
    requestingUserAccountId: number,
    requestingUserId?: number,
  ): Promise<void> {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    if (task.accountId !== requestingUserAccountId)
      throw new ForbiddenException('Access denied');

    // Collect affected users (assignees) before deletion
    let assigneeIds: number[] = [];
    try {
      const assignees = await this.taskRepository.getAssignees(id);
      assigneeIds = assignees.map((a: { userId: number }) => a.userId);
    } catch {
      assigneeIds = [];
    }
    if (task.assignedToUserId) assigneeIds.push(task.assignedToUserId);

    await this.taskRepository.softDelete(id);

    // Notify admins/PMs + affected assignees that the task was deleted
    void this.notificationsClient.broadcast({
      accountId: requestingUserAccountId,
      roleIds: ADMIN_PM_ROLES,
      userIds: assigneeIds,
      excludeUserId: requestingUserId,
      title: `Удалена задача: ${task.title}`,
      message: task.project?.name ? `Проект: ${task.project.name}` : undefined,
      notificationType: 'task_deleted',
      priority: 2,
      channels: ['in_app'],
      entityType: 'task',
      entityId: id,
    });
  }

  async setAssignees(
    taskId: number,
    assignees: { userId: number; userName?: string }[],
    requestingUserAccountId: number,
  ) {
    const task = await this.taskRepository.findById(taskId);
    if (!task) throw new NotFoundException('Task not found');
    if (task.accountId !== requestingUserAccountId)
      throw new ForbiddenException('Access denied');

    const result = await this.taskRepository.setAssignees(taskId, assignees);

    // Notify each newly assigned user
    const projectName = task.project?.name ? ` (${task.project.name})` : '';
    const payloads = assignees.map((a) => ({
      userId: a.userId,
      accountId: requestingUserAccountId,
      title: `Вам назначена задача: ${task.title}`,
      message: task.description
        ? task.description.slice(0, 150)
        : `Задача${projectName}`,
      notificationType: 'task_assigned',
      priority: (task.priority ?? 2) >= 3 ? 3 : 2,
      channels: ['in_app', 'push'],
      actionUrl: `/dashboard/tasks?edit=${taskId}`,
      entityType: 'task',
      entityId: taskId,
    }));

    this.notificationsClient.sendToMany(payloads);

    return result;
  }

  async getAssignees(taskId: number, requestingUserAccountId: number) {
    const task = await this.taskRepository.findById(taskId);
    if (!task) throw new NotFoundException('Task not found');
    if (task.accountId !== requestingUserAccountId)
      throw new ForbiddenException('Access denied');
    return this.taskRepository.getAssignees(taskId);
  }

  async getStats(accountId: number, projectId?: number) {
    return this.taskRepository.getStats(accountId, projectId);
  }
}
