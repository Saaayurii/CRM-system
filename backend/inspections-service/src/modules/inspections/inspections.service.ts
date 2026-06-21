import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InspectionRepository } from './repositories/inspection.repository';
import { NotificationsClientService } from '../../common/notifications/notifications-client.service';
import {
  CreateInspectionDto,
  UpdateInspectionDto,
  CreateInspectionTemplateDto,
  UpdateInspectionTemplateDto,
} from './dto';
import { PrismaService } from '../../database/prisma.service';
import {
  CLIENT_ROLE_ID,
  RequestUser,
  getClientAllowedProjectIds,
} from '../../common/helpers/client-access.helper';

// Admins + PM + inspector get inspection activity
const INSPECT_ROLES = [1, 2, 4, 9];

@Injectable()
export class InspectionsService {
  constructor(
    private readonly inspectionRepository: InspectionRepository,
    private readonly prisma: PrismaService,
    private readonly notificationsClient: NotificationsClientService,
  ) {}

  async findAll(
    user: RequestUser,
    page: number,
    limit: number,
    status?: number,
    projectId?: number,
    inspectorId?: number,
  ) {
    const allowedProjectIds = await getClientAllowedProjectIds(this.prisma, user);
    return this.inspectionRepository.findAll(
      user.accountId,
      page,
      limit,
      status,
      projectId,
      allowedProjectIds,
      inspectorId,
    );
  }

  async findById(id: number, user: RequestUser) {
    const inspection = await this.inspectionRepository.findById(id, user.accountId);
    if (!inspection) {
      throw new NotFoundException(`Inspection with ID ${id} not found`);
    }
    if (user.roleId === CLIENT_ROLE_ID) {
      const allowed = await getClientAllowedProjectIds(this.prisma, user);
      if (!inspection.projectId || !allowed?.includes(inspection.projectId)) {
        throw new ForbiddenException('Access denied');
      }
    }
    return inspection;
  }

  async create(accountId: number, dto: CreateInspectionDto, actorUserId?: number) {
    const inspection = await this.inspectionRepository.create({
      ...dto,
      accountId,
      scheduledDate: dto.scheduledDate
        ? new Date(dto.scheduledDate)
        : undefined,
      actualDate: dto.actualDate ? new Date(dto.actualDate) : undefined,
    });

    void this.notificationsClient.broadcast({
      accountId,
      roleIds: INSPECT_ROLES,
      userIds: inspection.inspectorId ? [inspection.inspectorId] : [],
      excludeUserId: actorUserId,
      title: `Назначена инспекция №${inspection.inspectionNumber}`,
      notificationType: 'inspection_scheduled',
      priority: 2,
      channels: ['in_app', 'push'],
      actionUrl: `/dashboard/inspections/${inspection.id}`,
      entityType: 'inspection',
      entityId: inspection.id,
    });

    return inspection;
  }

  async update(
    id: number,
    accountId: number,
    dto: UpdateInspectionDto,
    actorUserId?: number,
  ) {
    const existing = await this.inspectionRepository.findById(id, accountId);
    if (!existing) throw new NotFoundException(`Inspection with ID ${id} not found`);
    const data: any = { ...dto };
    if (dto.scheduledDate) data.scheduledDate = new Date(dto.scheduledDate);
    if (dto.actualDate) data.actualDate = new Date(dto.actualDate);
    await this.inspectionRepository.update(id, accountId, data);
    const updated = await this.inspectionRepository.findById(id, accountId);

    // Notify on status change (e.g. approved / failed / corrected)
    if (dto.status !== undefined && dto.status !== existing.status) {
      const STATUS_LABEL: Record<number, string> = {
        0: 'запланирована',
        1: 'в работе',
        2: 'пройдена',
        3: 'провалена',
        4: 'утверждена',
      };
      const label = STATUS_LABEL[dto.status] ?? `статус ${dto.status}`;
      const failed = dto.status === 3;
      void this.notificationsClient.broadcast({
        accountId,
        roleIds: INSPECT_ROLES,
        userIds: existing.inspectorId ? [existing.inspectorId] : [],
        excludeUserId: actorUserId,
        title: `Инспекция №${existing.inspectionNumber}: ${label}`,
        notificationType: failed ? 'inspection_failed' : 'inspection_updated',
        priority: failed ? 3 : 2,
        channels: failed ? ['in_app', 'push'] : ['in_app'],
        actionUrl: `/dashboard/inspections/${id}`,
        entityType: 'inspection',
        entityId: id,
      });
    }

    return updated;
  }

  async delete(id: number, accountId: number) {
    const existing = await this.inspectionRepository.findById(id, accountId);
    if (!existing) throw new NotFoundException(`Inspection with ID ${id} not found`);
    await this.inspectionRepository.delete(id, accountId);
    return { message: `Inspection with ID ${id} deleted successfully` };
  }

  // Checklist Templates
  async findAllTemplates(accountId: number, page: number, limit: number) {
    return this.inspectionRepository.findAllTemplates(accountId, page, limit);
  }

  async findTemplateById(id: number, accountId: number) {
    const template = await this.inspectionRepository.findTemplateById(
      id,
      accountId,
    );
    if (!template) {
      throw new NotFoundException(
        `Inspection template with ID ${id} not found`,
      );
    }
    return template;
  }

  async createTemplate(accountId: number, dto: CreateInspectionTemplateDto) {
    return this.inspectionRepository.createTemplate({
      ...dto,
      accountId,
    });
  }

  async updateTemplate(
    id: number,
    accountId: number,
    dto: UpdateInspectionTemplateDto,
  ) {
    await this.findTemplateById(id, accountId);
    await this.inspectionRepository.updateTemplate(id, accountId, dto);
    return this.findTemplateById(id, accountId);
  }

  async deleteTemplate(id: number, accountId: number) {
    await this.findTemplateById(id, accountId);
    await this.inspectionRepository.deleteTemplate(id, accountId);
    return {
      message: `Inspection template with ID ${id} deleted successfully`,
    };
  }
}
