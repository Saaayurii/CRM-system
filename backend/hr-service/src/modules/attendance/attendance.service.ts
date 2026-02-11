import { Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceRepository } from './repositories/attendance.repository';
import { CreateAttendanceDto, UpdateAttendanceDto } from './dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly repository: AttendanceRepository) {}

  async findAll(userId: number, page = 1, limit = 20) {
    return this.repository.findAll(userId, page, limit);
  }

  async findById(id: number, userId: number) {
    const attendance = await this.repository.findById(id, userId);
    if (!attendance)
      throw new NotFoundException(`Attendance record #${id} not found`);
    return attendance;
  }

  async create(userId: number, dto: CreateAttendanceDto) {
    return this.repository.create(userId, dto);
  }

  async update(id: number, userId: number, dto: UpdateAttendanceDto) {
    const attendance = await this.repository.update(id, userId, dto);
    if (!attendance)
      throw new NotFoundException(`Attendance record #${id} not found`);
    return attendance;
  }

  async delete(id: number, userId: number) {
    const attendance = await this.repository.delete(id, userId);
    if (!attendance)
      throw new NotFoundException(`Attendance record #${id} not found`);
    return attendance;
  }
}
