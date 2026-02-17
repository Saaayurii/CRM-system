import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TaskRepository } from './repositories/task.repository';
import { CreateTaskDto, UpdateTaskDto } from './dto';

@Injectable()
export class TasksService {
  constructor(private readonly taskRepository: TaskRepository) {}

  async findAll(
    accountId: number,
    page: number = 1,
    limit: number = 20,
    filters?: {
      projectId?: number;
      status?: number;
      assignedToUserId?: number;
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
    return this.taskRepository.create(
      { ...createTaskDto, accountId: requestingUserAccountId },
      requestingUserId,
    );
  }

  async update(
    id: number,
    updateTaskDto: UpdateTaskDto,
    requestingUserAccountId: number,
  ) {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    if (task.accountId !== requestingUserAccountId)
      throw new ForbiddenException('Access denied');
    return this.taskRepository.update(id, updateTaskDto);
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
    userIds: number[],
    requestingUserAccountId: number,
  ) {
    const task = await this.taskRepository.findById(taskId);
    if (!task) throw new NotFoundException('Task not found');
    if (task.accountId !== requestingUserAccountId)
      throw new ForbiddenException('Access denied');

    const assignees = userIds.map((userId) => ({ userId }));
    return this.taskRepository.setAssignees(taskId, assignees);
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
