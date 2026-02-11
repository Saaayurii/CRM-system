import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateTeamMemberDto, UpdateTeamMemberDto } from '../dto';

@Injectable()
export class TeamMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number, limit: number, teamId?: number, userId?: number) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (teamId !== undefined) {
      where.teamId = teamId;
    }
    if (userId !== undefined) {
      where.userId = userId;
    }
    const [data, total] = await Promise.all([
      (this.prisma as any).teamMember.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).teamMember.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number) {
    return (this.prisma as any).teamMember.findUnique({
      where: { id },
    });
  }

  async create(dto: CreateTeamMemberDto) {
    return (this.prisma as any).teamMember.create({
      data: {
        teamId: dto.teamId,
        userId: dto.userId,
        roleInTeam: dto.roleInTeam ?? null,
      },
    });
  }

  async update(id: number, dto: UpdateTeamMemberDto) {
    const record = await this.findById(id);
    if (!record) return null;
    return (this.prisma as any).teamMember.update({
      where: { id },
      data: {
        ...(dto.teamId !== undefined && { teamId: dto.teamId }),
        ...(dto.userId !== undefined && { userId: dto.userId }),
        ...(dto.roleInTeam !== undefined && { roleInTeam: dto.roleInTeam }),
      },
    });
  }

  async delete(id: number) {
    const record = await this.findById(id);
    if (!record) return null;
    return (this.prisma as any).teamMember.delete({ where: { id } });
  }
}
