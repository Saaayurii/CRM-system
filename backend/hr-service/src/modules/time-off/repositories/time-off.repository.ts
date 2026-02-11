import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateTimeOffRequestDto, UpdateTimeOffRequestDto } from '../dto';

@Injectable()
export class TimeOffRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      (this.prisma as any).timeOffRequest.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).timeOffRequest.count({ where: { userId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, userId: number) {
    return (this.prisma as any).timeOffRequest.findFirst({
      where: { id, userId },
    });
  }

  async create(userId: number, dto: CreateTimeOffRequestDto) {
    return (this.prisma as any).timeOffRequest.create({
      data: {
        userId,
        requestType: dto.requestType,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        daysCount: dto.daysCount,
        reason: dto.reason,
      },
    });
  }

  async update(id: number, userId: number, dto: UpdateTimeOffRequestDto) {
    const record = await this.findById(id, userId);
    if (!record) return null;
    return (this.prisma as any).timeOffRequest.update({
      where: { id },
      data: {
        ...(dto.requestType !== undefined && { requestType: dto.requestType }),
        ...(dto.startDate !== undefined && {
          startDate: new Date(dto.startDate),
        }),
        ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        ...(dto.daysCount !== undefined && { daysCount: dto.daysCount }),
        ...(dto.reason !== undefined && { reason: dto.reason }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.approvedByUserId !== undefined && {
          approvedByUserId: dto.approvedByUserId,
        }),
        ...(dto.approvedAt !== undefined && {
          approvedAt: new Date(dto.approvedAt),
        }),
      },
    });
  }

  async delete(id: number, userId: number) {
    const record = await this.findById(id, userId);
    if (!record) return null;
    return (this.prisma as any).timeOffRequest.delete({ where: { id } });
  }
}
