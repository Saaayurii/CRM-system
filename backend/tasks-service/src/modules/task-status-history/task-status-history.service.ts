import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskStatusHistoryRepository } from './repositories/task-status-history.repository';
import { CreateTaskStatusHistoryDto } from './dto';

@Injectable()
export class TaskStatusHistoryService {
  constructor(private readonly taskStatusHistoryRepository: TaskStatusHistoryRepository) {}

  async findAll(
    page: number = 1,
    limit: number = 20,
    filters?: { taskId?: number },
  ) {
    const skip = (page - 1) * limit;
    return this.taskStatusHistoryRepository.findAll({
      skip,
      take: limit,
      taskId: filters?.taskId,
    });
  }

  async findById(id: number) {
    const record = await this.taskStatusHistoryRepository.findById(id);
    if (!record) throw new NotFoundException('Task status history record not found');
    return record;
  }

  async create(createDto: CreateTaskStatusHistoryDto) {
    return this.taskStatusHistoryRepository.create(createDto);
  }
}
