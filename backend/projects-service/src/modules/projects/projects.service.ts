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

@Injectable()
export class ProjectsService {
  constructor(private readonly projectRepository: ProjectRepository) {}

  async findAll(
    accountId: number,
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
    const [projects, total] = await Promise.all([
      this.projectRepository.findAll(accountId, { skip, take: limit, status }),
      this.projectRepository.count(accountId, status),
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
    requestingUserAccountId: number,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return this.toResponseDto(project);
  }

  async create(
    createProjectDto: CreateProjectDto,
    requestingUserAccountId: number,
  ): Promise<ProjectResponseDto> {
    if (createProjectDto.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Cannot create projects in another account');
    }

    if (createProjectDto.code) {
      const existingProject = await this.projectRepository.findByCode(
        createProjectDto.code,
      );
      if (existingProject) {
        throw new ConflictException('Project with this code already exists');
      }
    }

    const project = await this.projectRepository.create(createProjectDto);
    return this.toResponseDto(project);
  }

  async update(
    id: number,
    updateProjectDto: UpdateProjectDto,
    requestingUserAccountId: number,
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

    await this.projectRepository.softDelete(id);
  }

  async addTeamMember(
    projectId: number,
    addTeamMemberDto: AddTeamMemberDto,
    requestingUserAccountId: number,
  ) {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    try {
      return await this.projectRepository.addTeamMember(
        projectId,
        addTeamMemberDto.userId,
        addTeamMemberDto.role,
      );
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('User is already a team member');
      }
      throw error;
    }
  }

  async removeTeamMember(
    projectId: number,
    userId: number,
    requestingUserAccountId: number,
  ): Promise<void> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    await this.projectRepository.removeTeamMember(projectId, userId);
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
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
