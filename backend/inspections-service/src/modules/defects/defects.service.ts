import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DefectRepository } from './repositories/defect.repository';
import { NotificationsClientService } from '../../common/notifications/notifications-client.service';
import {
  CreateDefectDto,
  UpdateDefectDto,
  CreateDefectTemplateDto,
  UpdateDefectTemplateDto,
} from './dto';
import { PrismaService } from '../../database/prisma.service';
import {
  CLIENT_ROLE_ID,
  RequestUser,
  getClientAllowedProjectIds,
} from '../../common/helpers/client-access.helper';

const INSPECT_ROLES = [1, 2, 4, 9];

const DEFECT_STATUS_LABEL: Record<number, string> = {
  0: 'открыт',
  1: 'назначен',
  2: 'в работе',
  3: 'устранён',
  4: 'проверен',
  5: 'закрыт',
};

@Injectable()
export class DefectsService {
  constructor(
    private readonly defectRepository: DefectRepository,
    private readonly prisma: PrismaService,
    private readonly notificationsClient: NotificationsClientService,
  ) {}

  async findAll(
    user: RequestUser,
    page: number,
    limit: number,
    status?: number,
    projectId?: number,
    assignedToUserId?: number,
  ) {
    const allowedProjectIds = await getClientAllowedProjectIds(this.prisma, user);
    return this.defectRepository.findAll(
      user.accountId,
      page,
      limit,
      status,
      projectId,
      allowedProjectIds,
      assignedToUserId,
    );
  }

  async findById(id: number, user: RequestUser) {
    const defect = await this.defectRepository.findById(id, user.accountId);
    if (!defect) {
      throw new NotFoundException(`Defect with ID ${id} not found`);
    }
    if (user.roleId === CLIENT_ROLE_ID) {
      const allowed = await getClientAllowedProjectIds(this.prisma, user);
      if (!defect.projectId || !allowed?.includes(defect.projectId)) {
        throw new ForbiddenException('Access denied');
      }
    }
    return defect;
  }

  async create(accountId: number, dto: CreateDefectDto, actorUserId?: number) {
    const defect = await this.defectRepository.create({
      ...dto,
      accountId,
      reportedDate: new Date(dto.reportedDate),
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      fixedDate: dto.fixedDate ? new Date(dto.fixedDate) : undefined,
      verifiedDate: dto.verifiedDate ? new Date(dto.verifiedDate) : undefined,
    });

    const isCritical = (defect.severity ?? 0) >= 3;
    void this.notificationsClient.broadcast({
      accountId,
      roleIds: INSPECT_ROLES,
      userIds: defect.assignedToUserId ? [defect.assignedToUserId] : [],
      excludeUserId: actorUserId,
      title: `Зафиксирован дефект: ${defect.title}`,
      message: defect.description || undefined,
      notificationType: 'defect_found',
      priority: isCritical ? 3 : 2,
      channels: isCritical ? ['in_app', 'push'] : ['in_app'],
      actionUrl: `/dashboard/technadzor/defects/${defect.id}`,
      entityType: 'defect',
      entityId: defect.id,
    });

    return defect;
  }

  // Комментарии к дефекту
  async getComments(defectId: number, user: RequestUser) {
    await this.findById(defectId, user); // проверка доступа/существования (404/403)
    return this.defectRepository.findComments(defectId);
  }

  async addComment(
    defectId: number,
    user: RequestUser,
    commentText: string,
    userName?: string,
    attachments?: any[],
  ) {
    const defect = await this.findById(defectId, user);
    return this.defectRepository.addComment({
      defectId,
      accountId: defect.accountId,
      userId: user.id,
      userName,
      commentText: commentText || '',
      attachments: Array.isArray(attachments) ? attachments : [],
    });
  }

  async update(
    id: number,
    accountId: number,
    dto: UpdateDefectDto,
    actorUserId?: number,
  ) {
    const existing = await this.defectRepository.findById(id, accountId);
    if (!existing) throw new NotFoundException(`Defect with ID ${id} not found`);
    const data: any = { ...dto };
    if (dto.reportedDate) data.reportedDate = new Date(dto.reportedDate);
    if (dto.dueDate) data.dueDate = new Date(dto.dueDate);
    if (dto.fixedDate) data.fixedDate = new Date(dto.fixedDate);
    if (dto.verifiedDate) data.verifiedDate = new Date(dto.verifiedDate);
    await this.defectRepository.update(id, accountId, data);
    const updated = await this.defectRepository.findById(id, accountId);

    // Уведомление при смене статуса дефекта (исполнитель + инспекторы)
    if (dto.status !== undefined && dto.status !== existing.status) {
      const label = DEFECT_STATUS_LABEL[dto.status] ?? `статус ${dto.status}`;
      void this.notificationsClient.broadcast({
        accountId,
        roleIds: INSPECT_ROLES,
        userIds: updated.assignedToUserId ? [updated.assignedToUserId] : [],
        excludeUserId: actorUserId,
        title: `Дефект «${updated.title}»: ${label}`,
        message: updated.description || undefined,
        notificationType: 'defect_status_changed',
        priority: 2,
        channels: ['in_app'],
        actionUrl: `/dashboard/technadzor/defects/${updated.id}`,
        entityType: 'defect',
        entityId: updated.id,
      });
    }

    return updated;
  }

  async delete(id: number, accountId: number) {
    const existing = await this.defectRepository.findById(id, accountId);
    if (!existing) throw new NotFoundException(`Defect with ID ${id} not found`);
    await this.defectRepository.delete(id, accountId);
    return { message: `Defect with ID ${id} deleted successfully` };
  }

  // Defect Templates
  async findAllTemplates(accountId: number, page: number, limit: number) {
    return this.defectRepository.findAllTemplates(accountId, page, limit);
  }

  async findTemplateById(id: number, accountId: number) {
    const template = await this.defectRepository.findTemplateById(
      id,
      accountId,
    );
    if (!template) {
      throw new NotFoundException(`Defect template with ID ${id} not found`);
    }
    return template;
  }

  async createTemplate(accountId: number, dto: CreateDefectTemplateDto) {
    return this.defectRepository.createTemplate({
      ...dto,
      accountId,
    });
  }

  async updateTemplate(
    id: number,
    accountId: number,
    dto: UpdateDefectTemplateDto,
  ) {
    await this.findTemplateById(id, accountId);
    await this.defectRepository.updateTemplate(id, accountId, dto);
    return this.findTemplateById(id, accountId);
  }

  async deleteTemplate(id: number, accountId: number) {
    await this.findTemplateById(id, accountId);
    await this.defectRepository.deleteTemplate(id, accountId);
    return { message: `Defect template with ID ${id} deleted successfully` };
  }
}
