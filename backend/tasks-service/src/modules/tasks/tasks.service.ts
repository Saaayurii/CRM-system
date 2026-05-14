import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TaskRepository } from './repositories/task.repository';
import { NotificationsClientService } from './notifications-client.service';
import { CreateTaskDto, UpdateTaskDto } from './dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly notificationsClient: NotificationsClientService,
  ) {}

  async findAll(
    accountId: number,
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
    const [tasks, total] = await Promise.all([
      this.taskRepository.findAll(accountId, { skip, take: limit, ...filters }),
      this.taskRepository.count(accountId, filters),
    ]);

    return { tasks, total, page, limit };
  }

  async findById(id: number, requestingUserAccountId: number) {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    if (task.accountId !== requestingUserAccountId)
      throw new ForbiddenException('Access denied');
    return task;
  }

  async findByProject(projectId: number, accountId: number) {
    return this.taskRepository.findByProject(projectId, accountId);
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
        actionUrl: `/dashboard/tasks/${task.id}`,
        entityType: 'task',
        entityId: task.id,
      }]);
    }

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

    const updated = await this.taskRepository.update(id, updateTaskDto);

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
        actionUrl: `/dashboard/tasks/${id}`,
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
          actionUrl: `/dashboard/tasks/${id}`,
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
          actionUrl: `/dashboard/tasks/${id}`,
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
            actionUrl: `/dashboard/tasks/${id}`,
            entityType: 'task',
            entityId: id,
          }]);
        }
      }
    }

    return updated;
  }

  async remove(id: number, requestingUserAccountId: number): Promise<void> {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    if (task.accountId !== requestingUserAccountId)
      throw new ForbiddenException('Access denied');
    await this.taskRepository.softDelete(id);
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
      actionUrl: `/dashboard/tasks/${taskId}`,
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
