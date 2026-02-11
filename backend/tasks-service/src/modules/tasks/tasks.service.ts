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
    if (createTaskDto.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Cannot create tasks in another account');
    }
    return this.taskRepository.create(createTaskDto, requestingUserId);
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

  async getStats(accountId: number, projectId?: number) {
    return this.taskRepository.getStats(accountId, projectId);
  }
}
