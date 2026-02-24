import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateTimeOffRequestDto, UpdateTimeOffRequestDto } from '../dto';

@Injectable()
export class TimeOffRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: number | null, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = userId !== null ? { userId } : {};
    const [data, total] = await Promise.all([
      (this.prisma as any).timeOffRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      }),
      (this.prisma as any).timeOffRequest.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, userId: number | null) {
    const where: any = { id };
    if (userId !== null) where.userId = userId;
    return (this.prisma as any).timeOffRequest.findFirst({ where });
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

  async update(id: number, userId: number | null, dto: UpdateTimeOffRequestDto) {
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

  async delete(id: number, userId: number | null) {
    const record = await this.findById(id, userId);
    if (!record) return null;
    return (this.prisma as any).timeOffRequest.delete({ where: { id } });
  }
}
