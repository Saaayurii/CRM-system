import { Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceRepository } from './repositories/attendance.repository';
import { CreateAttendanceDto, UpdateAttendanceDto } from './dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly repository: AttendanceRepository) {}

  async findAll(userId: number, roleId: number, page = 1, limit = 20) {
    const filterUserId = [1, 2, 3].includes(roleId) ? null : userId;
    return this.repository.findAll(filterUserId, page, limit);
  }

  async findById(id: number, userId: number, roleId: number) {
    const filterUserId = [1, 2, 3].includes(roleId) ? null : userId;
    const attendance = await this.repository.findById(id, filterUserId);
    if (!attendance)
      throw new NotFoundException(`Attendance record #${id} not found`);
    return attendance;
  }

  async create(userId: number, roleId: number, dto: CreateAttendanceDto) {
    const targetUserId =
      [1, 2, 3].includes(roleId) && dto.userId ? dto.userId : userId;
    return this.repository.create(targetUserId, dto);
  }

  async update(id: number, userId: number, roleId: number, dto: UpdateAttendanceDto) {
    const filterUserId = [1, 2, 3].includes(roleId) ? null : userId;
    const attendance = await this.repository.update(id, filterUserId, dto);
    if (!attendance)
      throw new NotFoundException(`Attendance record #${id} not found`);
    return attendance;
  }

  async delete(id: number, userId: number, roleId: number) {
    const filterUserId = [1, 2, 3].includes(roleId) ? null : userId;
    const attendance = await this.repository.delete(id, filterUserId);
    if (!attendance)
      throw new NotFoundException(`Attendance record #${id} not found`);
    return attendance;
  }
}
