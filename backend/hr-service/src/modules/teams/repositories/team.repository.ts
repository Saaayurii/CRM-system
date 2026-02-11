import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateTeamDto, UpdateTeamDto } from '../dto';

@Injectable()
export class TeamRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    accountId: number,
    page: number,
    limit: number,
    status?: number,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { accountId };
    if (status !== undefined) {
      where.status = status;
    }
    const [data, total] = await Promise.all([
      (this.prisma as any).team.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).team.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number, accountId: number) {
    return (this.prisma as any).team.findFirst({
      where: { id, accountId },
      include: { members: true },
    });
  }

  async create(accountId: number, dto: CreateTeamDto) {
    return (this.prisma as any).team.create({
      data: {
        accountId,
        name: dto.name,
        description: dto.description ?? null,
        teamLeadId: dto.teamLeadId ?? null,
        status: dto.status ?? 1,
      },
    });
  }

  async update(id: number, accountId: number, dto: UpdateTeamDto) {
    const record = await this.findById(id, accountId);
    if (!record) return null;
    return (this.prisma as any).team.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.teamLeadId !== undefined && { teamLeadId: dto.teamLeadId }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  async delete(id: number, accountId: number) {
    const record = await this.findById(id, accountId);
    if (!record) return null;
    return (this.prisma as any).team.delete({ where: { id } });
  }

  async findMembers(id: number, accountId: number) {
    const team = await (this.prisma as any).team.findFirst({
      where: { id, accountId },
    });
    if (!team) return null;
    return (this.prisma as any).teamMember.findMany({
      where: { teamId: id },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async addMember(
    teamId: number,
    accountId: number,
    data: { userId: number; roleInTeam?: string },
  ) {
    const team = await (this.prisma as any).team.findFirst({
      where: { id: teamId, accountId },
    });
    if (!team) return null;
    return (this.prisma as any).teamMember.create({
      data: {
        teamId,
        userId: data.userId,
        roleInTeam: data.roleInTeam ?? null,
      },
    });
  }
}
