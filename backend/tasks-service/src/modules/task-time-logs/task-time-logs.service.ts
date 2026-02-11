import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskTimeLogRepository } from './repositories/task-time-log.repository';
import { CreateTaskTimeLogDto, UpdateTaskTimeLogDto } from './dto';

@Injectable()
export class TaskTimeLogsService {
  constructor(private readonly taskTimeLogRepository: TaskTimeLogRepository) {}

  async findAll(
    page: number = 1,
    limit: number = 20,
    filters?: { taskId?: number; userId?: number },
  ) {
    const skip = (page - 1) * limit;
    return this.taskTimeLogRepository.findAll({
      skip,
      take: limit,
      taskId: filters?.taskId,
      userId: filters?.userId,
    });
  }

  async findById(id: number) {
    const timeLog = await this.taskTimeLogRepository.findById(id);
    if (!timeLog) throw new NotFoundException('Task time log not found');
    return timeLog;
  }

  async create(createDto: CreateTaskTimeLogDto) {
    return this.taskTimeLogRepository.create(createDto);
  }

  async update(id: number, updateDto: UpdateTaskTimeLogDto) {
    const timeLog = await this.taskTimeLogRepository.findById(id);
    if (!timeLog) throw new NotFoundException('Task time log not found');
    return this.taskTimeLogRepository.update(id, updateDto);
  }

  async remove(id: number): Promise<void> {
    const timeLog = await this.taskTimeLogRepository.findById(id);
    if (!timeLog) throw new NotFoundException('Task time log not found');
    await this.taskTimeLogRepository.delete(id);
  }
}
