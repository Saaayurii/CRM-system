import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from '../dto';

@Injectable()
export class ProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: number, options?: { skip?: number; take?: number; status?: number }) {
    const where: any = {
      accountId,
      deletedAt: null,
    };
    if (options?.status !== undefined) {
      where.status = options.status;
    }

    return (this.prisma as any).project.findMany({
      where,
      include: {
        projectManager: {
          select: { id: true, name: true, email: true },
        },
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    return (this.prisma as any).project.findFirst({
      where: { id, deletedAt: null },
      include: {
        projectManager: {
          select: { id: true, name: true, email: true },
        },
        projectTeams: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });
  }

  async findByCode(code: string) {
    return (this.prisma as any).project.findFirst({
      where: { code, deletedAt: null },
    });
  }

  async create(data: CreateProjectDto) {
    return (this.prisma as any).project.create({
      data: {
        accountId: data.accountId,
        name: data.name,
        code: data.code,
        description: data.description,
        projectManagerId: data.projectManagerId,
        clientName: data.clientName,
        clientContact: data.clientContact,
        startDate: data.startDate ? new Date(data.startDate) : null,
        plannedEndDate: data.plannedEndDate ? new Date(data.plannedEndDate) : null,
        budget: data.budget,
        priority: data.priority || 2,
        address: data.address,
        coordinates: data.coordinates,
      },
      include: {
        projectManager: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async update(id: number, data: UpdateProjectDto) {
    const updateData: any = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.plannedEndDate) updateData.plannedEndDate = new Date(data.plannedEndDate);
    if (data.actualEndDate) updateData.actualEndDate = new Date(data.actualEndDate);

    return (this.prisma as any).project.update({
      where: { id },
      data: updateData,
      include: {
        projectManager: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async softDelete(id: number) {
    return (this.prisma as any).project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async count(accountId: number, status?: number) {
    const where: any = { accountId, deletedAt: null };
    if (status !== undefined) where.status = status;
    return (this.prisma as any).project.count({ where });
  }

  async addTeamMember(projectId: number, userId: number, role?: string) {
    return (this.prisma as any).projectTeam.create({
      data: { projectId, userId, role },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async removeTeamMember(projectId: number, userId: number) {
    return (this.prisma as any).projectTeam.delete({
      where: {
        projectId_userId: { projectId, userId },
      },
    });
  }

  async getTeamMembers(projectId: number) {
    return (this.prisma as any).projectTeam.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}
