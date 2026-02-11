import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskCommentRepository } from './repositories/task-comment.repository';
import { CreateTaskCommentDto, UpdateTaskCommentDto } from './dto';

@Injectable()
export class TaskCommentsService {
  constructor(private readonly taskCommentRepository: TaskCommentRepository) {}

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

  async create(createDto: CreateTaskCommentDto) {
    return this.taskCommentRepository.create(createDto);
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
