import { Injectable, NotFoundException } from '@nestjs/common';
import { UserAssignmentRepository } from './repositories/user-assignment.repository';
import { CreateUserAssignmentDto, UpdateUserAssignmentDto } from './dto';

@Injectable()
export class UserAssignmentsService {
  constructor(private readonly userAssignmentRepository: UserAssignmentRepository) {}

  async findAll(
    page: number,
    limit: number,
    projectId?: number,
    userId?: number,
  ) {
    return this.userAssignmentRepository.findAll(page, limit, projectId, userId);
  }

  async findById(id: number) {
    const assignment = await this.userAssignmentRepository.findById(id);
    if (!assignment) {
      throw new NotFoundException(`User assignment with ID ${id} not found`);
    }
    return assignment;
  }

  async create(dto: CreateUserAssignmentDto) {
    return this.userAssignmentRepository.create({
      ...dto,
      assignedAt: dto.assignedAt ? new Date(dto.assignedAt) : undefined,
      removedAt: dto.removedAt ? new Date(dto.removedAt) : undefined,
    });
  }

  async update(id: number, dto: UpdateUserAssignmentDto) {
    await this.findById(id);
    const data: any = { ...dto };
    if (dto.assignedAt) data.assignedAt = new Date(dto.assignedAt);
    if (dto.removedAt) data.removedAt = new Date(dto.removedAt);
    await this.userAssignmentRepository.update(id, data);
    return this.findById(id);
  }

  async delete(id: number) {
    await this.findById(id);
    await this.userAssignmentRepository.delete(id);
    return { message: `User assignment with ID ${id} deleted successfully` };
  }
}
