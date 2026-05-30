import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ProjectRepository } from './repositories/project.repository';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectResponseDto,
  AddTeamMemberDto,
} from './dto';
import { NotificationsClientService } from './notifications-client.service';
import { PrismaService } from '../../database/prisma.service';
import {
  CLIENT_ROLE_ID,
  RequestUser,
  getClientAllowedProjectIds,
} from '../../common/helpers/client-access.helper';

const PROJECT_STATUS_LABELS: Record<number, string> = {
  0: 'Черновик',
  1: 'Активный',
  2: 'Приостановлен',
  3: 'Завершён',
  4: 'Отменён',
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly notificationsClient: NotificationsClientService,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(
    user: RequestUser,
    page: number = 1,
    limit: number = 20,
    status?: number,
  ): Promise<{
    projects: ProjectResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const allowedIds = await getClientAllowedProjectIds(this.prisma, user);
    const [projects, total] = await Promise.all([
      this.projectRepository.findAll(user.accountId, {
        skip,
        take: limit,
        status,
        allowedIds,
      }),
      this.projectRepository.count(user.accountId, status, allowedIds),
    ]);

    return {
      projects: projects.map(this.toResponseDto),
      total,
      page,
      limit,
    };
  }

  async findById(
    id: number,
    user: RequestUser,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.accountId !== user.accountId) {
      throw new ForbiddenException('Access denied');
    }

    if (user.roleId === CLIENT_ROLE_ID) {
      const allowedIds = await getClientAllowedProjectIds(this.prisma, user);
      if (!allowedIds?.includes(project.id)) {
        throw new ForbiddenException('Access denied');
      }
    }

    return this.toResponseDto(project);
  }

  async create(
    createProjectDto: CreateProjectDto,
    requestingUserAccountId: number,
    requestingUserId?: number,
  ): Promise<ProjectResponseDto> {
    if (createProjectDto.code) {
      const existingProject = await this.projectRepository.findByCode(
        createProjectDto.code,
      );
      if (existingProject) {
        throw new ConflictException('Project with this code already exists');
      }
    }

    const project = await this.projectRepository.create({
      ...createProjectDto,
      accountId: requestingUserAccountId,
    });

    // Notify admins/PMs (and the assigned PM) about the new project
    void this.notificationsClient.broadcast({
      accountId: requestingUserAccountId,
      roleIds: [1, 2, 4],
      userIds: project.projectManagerId ? [project.projectManagerId] : [],
      excludeUserId: requestingUserId,
      title: `Создан проект: ${project.name}`,
      message: project.code ? `Код: ${project.code}` : undefined,
      notificationType: 'project_created',
      priority: 2,
      channels: ['in_app'],
      actionUrl: `/dashboard/projects/${project.id}`,
      entityType: 'project',
      entityId: project.id,
    });

    return this.toResponseDto(project);
  }

  async update(
    id: number,
    updateProjectDto: UpdateProjectDto,
    requestingUserAccountId: number,
    requestingUserId?: number,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    if (updateProjectDto.code && updateProjectDto.code !== project.code) {
      const existingProject = await this.projectRepository.findByCode(
        updateProjectDto.code,
      );
      if (existingProject) {
        throw new ConflictException('Project with this code already exists');
      }
    }

    const updatedProject = await this.projectRepository.update(
      id,
      updateProjectDto,
    );

    // Notify PM and creator when project status changes
    if (
      updateProjectDto.status !== undefined &&
      updateProjectDto.status !== project.status
    ) {
      const newStatusLabel = PROJECT_STATUS_LABELS[updateProjectDto.status] ?? `Статус ${updateProjectDto.status}`;
      const recipients = new Set<number>();
      if (project.projectManagerId) recipients.add(project.projectManagerId);
      if (requestingUserId) recipients.delete(requestingUserId); // don't notify the person who changed it

      for (const userId of recipients) {
        void this.notificationsClient.sendNotification({
          userId,
          accountId: requestingUserAccountId,
          title: `Статус проекта изменён: ${project.name}`,
          message: `Проект переведён в статус «${newStatusLabel}»`,
          notificationType: 'project_status_changed',
          priority: updateProjectDto.status === 4 ? 3 : 2,
          channels: ['in_app', 'push'],
          actionUrl: `/dashboard/projects/${id}`,
          entityType: 'project',
          entityId: id,
        });
      }
    }

    // Notify PM if deadline is set/changed
    if (
      updateProjectDto.plannedEndDate !== undefined &&
      project.projectManagerId &&
      project.projectManagerId !== requestingUserId
    ) {
      const deadline = new Date(updateProjectDto.plannedEndDate);
      const now = new Date();
      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
      if (daysLeft <= 7 && daysLeft > 0) {
        void this.notificationsClient.sendNotification({
          userId: project.projectManagerId,
          accountId: requestingUserAccountId,
          title: `Дедлайн проекта через ${daysLeft} дн.: ${project.name}`,
          message: `Срок завершения проекта приближается`,
          notificationType: 'project_deadline',
          priority: daysLeft <= 2 ? 3 : 2,
          channels: ['in_app', 'push'],
          actionUrl: `/dashboard/projects/${id}`,
          entityType: 'project',
          entityId: id,
        });
      }
    }

    return this.toResponseDto(updatedProject);
  }

  async remove(id: number, requestingUserAccountId: number): Promise<void> {
    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    // Notify PM about deletion
    if (project.projectManagerId) {
      void this.notificationsClient.sendNotification({
        userId: project.projectManagerId,
        accountId: requestingUserAccountId,
        title: `Проект удалён: ${project.name}`,
        message: 'Проект был удалён из системы',
        notificationType: 'project_deleted',
        priority: 2,
        channels: ['in_app'],
        entityType: 'project',
        entityId: id,
      });
    }

    await this.projectRepository.softDelete(id);
  }

  async addTeamMember(
    projectId: number,
    addTeamMemberDto: AddTeamMemberDto,
    requestingUserAccountId: number,
    requestingUserId?: number,
  ) {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    try {
      const result = await this.projectRepository.addTeamMember(
        projectId,
        addTeamMemberDto.teamId,
        addTeamMemberDto.isPrimary,
      );

      // Try to get team members and notify them
      try {
        const teamMembers = await this.projectRepository.getTeamMembersByTeamId?.(addTeamMemberDto.teamId);
        if (Array.isArray(teamMembers) && teamMembers.length > 0) {
          const payloads = teamMembers
            .filter((m: any) => m.userId !== requestingUserId)
            .map((m: any) => ({
              userId: m.userId,
              accountId: requestingUserAccountId,
              title: `Вас добавили на проект: ${project.name}`,
              message: `Ваша команда назначена на проект`,
              notificationType: 'project_member_added',
              priority: 2,
              channels: ['in_app', 'push'],
              actionUrl: `/dashboard/projects/${projectId}`,
              entityType: 'project',
              entityId: projectId,
            }));
          this.notificationsClient.sendToMany(payloads);
        }
      } catch { /* team members fetch failed, skip notification */ }

      return result;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Team is already assigned to project');
      }
      throw error;
    }
  }

  async removeTeamMember(
    projectId: number,
    teamId: number,
    requestingUserAccountId: number,
    requestingUserId?: number,
  ): Promise<void> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    // Notify team members before removal
    try {
      const teamMembers = await this.projectRepository.getTeamMembersByTeamId?.(teamId);
      if (Array.isArray(teamMembers) && teamMembers.length > 0) {
        const payloads = teamMembers
          .filter((m: any) => m.userId !== requestingUserId)
          .map((m: any) => ({
            userId: m.userId,
            accountId: requestingUserAccountId,
            title: `Вас убрали с проекта: ${project.name}`,
            message: `Ваша команда снята с проекта`,
            notificationType: 'project_member_removed',
            priority: 2,
            channels: ['in_app'],
            entityType: 'project',
            entityId: projectId,
          }));
        this.notificationsClient.sendToMany(payloads);
      }
    } catch { /* skip notification on error */ }

    await this.projectRepository.removeTeamMember(projectId, teamId);
  }

  async getTeamMembers(projectId: number, requestingUserAccountId: number) {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return this.projectRepository.getTeamMembers(projectId);
  }

  private toResponseDto(project: any): ProjectResponseDto {
    return {
      id: project.id,
      accountId: project.accountId,
      name: project.name,
      code: project.code,
      description: project.description,
      projectManagerId: project.projectManagerId,
      projectManager: project.projectManager,
      clientName: project.clientName,
      clientContact: project.clientContact,
      startDate: project.startDate,
      plannedEndDate: project.plannedEndDate,
      actualEndDate: project.actualEndDate,
      budget: project.budget ? Number(project.budget) : undefined,
      actualCost: project.actualCost ? Number(project.actualCost) : undefined,
      status: project.status,
      priority: project.priority,
      address: project.address,
      coordinates: project.coordinates,
      settings: project.settings,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
