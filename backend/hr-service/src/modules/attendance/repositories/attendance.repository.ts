import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateAttendanceDto, UpdateAttendanceDto } from '../dto';

@Injectable()
export class AttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: number | null, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = userId !== null ? { userId } : {};
    const [data, total] = await Promise.all([
      (this.prisma as any).attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { attendanceDate: 'desc' },
        include: { user: { select: { name: true } } },
      }),
      (this.prisma as any).attendance.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, userId: number | null) {
    const where: any = { id };
    if (userId !== null) where.userId = userId;
    return (this.prisma as any).attendance.findFirst({ where });
  }

  async create(userId: number, dto: CreateAttendanceDto) {
    return (this.prisma as any).attendance.create({
      data: {
        userId,
        projectId: dto.projectId,
        constructionSiteId: dto.constructionSiteId,
        attendanceDate: new Date(dto.attendanceDate),
        checkInTime: dto.checkInTime ? new Date(dto.checkInTime) : null,
        checkOutTime: dto.checkOutTime ? new Date(dto.checkOutTime) : null,
        workedHours: dto.workedHours,
        overtimeHours: dto.overtimeHours,
        status: dto.status,
        notes: dto.notes,
      },
    });
  }

  async update(id: number, userId: number | null, dto: UpdateAttendanceDto) {
    const record = await this.findById(id, userId);
    if (!record) return null;
    return (this.prisma as any).attendance.update({
      where: { id },
      data: {
        ...(dto.projectId !== undefined && { projectId: dto.projectId }),
        ...(dto.constructionSiteId !== undefined && {
          constructionSiteId: dto.constructionSiteId,
        }),
        ...(dto.attendanceDate !== undefined && {
          attendanceDate: new Date(dto.attendanceDate),
        }),
        ...(dto.checkInTime !== undefined && {
          checkInTime: dto.checkInTime ? new Date(dto.checkInTime) : null,
        }),
        ...(dto.checkOutTime !== undefined && {
          checkOutTime: dto.checkOutTime ? new Date(dto.checkOutTime) : null,
        }),
        ...(dto.workedHours !== undefined && { workedHours: dto.workedHours }),
        ...(dto.overtimeHours !== undefined && {
          overtimeHours: dto.overtimeHours,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async delete(id: number, userId: number | null) {
    const record = await this.findById(id, userId);
    if (!record) return null;
    return (this.prisma as any).attendance.delete({ where: { id } });
  }
}
