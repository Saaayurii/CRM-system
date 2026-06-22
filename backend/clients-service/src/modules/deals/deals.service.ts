import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DealRepository } from './repositories/deal.repository';
import { DealStageRepository } from './repositories/deal-stage.repository';
import { NotificationsClientService } from '../../common/notifications/notifications-client.service';
import { CreateDealDto, UpdateDealDto } from './dto';

// Admins + PM получают уведомления о выигранных сделках
const DEAL_ADMIN_ROLES = [1, 2, 4];

@Injectable()
export class DealsService {
  constructor(
    private readonly repo: DealRepository,
    private readonly stageRepo: DealStageRepository,
    private readonly notificationsClient: NotificationsClientService,
  ) {}

  findAll(
    accountId: number,
    status?: string,
    managerId?: number,
    clientId?: number,
  ) {
    return this.repo.findAll(accountId, status, managerId, clientId);
  }

  async findById(id: number, accountId: number) {
    const deal = await this.repo.findById(id, accountId);
    if (!deal) throw new NotFoundException(`Deal #${id} not found`);
    return deal;
  }

  async stats(accountId: number) {
    const rows = await this.repo.statsByStage(accountId);
    return rows.map((r: any) => ({
      stageId: r.stageId,
      count: r._count?._all ?? 0,
      sum: r._sum?.amount ? Number(r._sum.amount) : 0,
    }));
  }

  async create(accountId: number, dto: CreateDealDto, actorUserId?: number) {
    // Стадии сидируются здесь же, если их ещё нет
    let stageId = dto.stageId;
    if (!stageId) {
      const stages = await this.stageRepo.findAll(accountId);
      stageId = stages[0]?.id;
    }
    if (!stageId) throw new BadRequestException('Не настроена воронка');

    return this.repo.create(accountId, {
      ...dto,
      stageId,
      createdByUserId: actorUserId,
      expectedCloseDate: dto.expectedCloseDate
        ? new Date(dto.expectedCloseDate)
        : undefined,
    });
  }

  async update(
    id: number,
    accountId: number,
    dto: UpdateDealDto,
    actorUserId?: number,
  ) {
    const existing = await this.repo.findById(id, accountId);
    if (!existing) throw new NotFoundException(`Deal #${id} not found`);

    const data: any = { ...dto };
    if (dto.expectedCloseDate !== undefined)
      data.expectedCloseDate = dto.expectedCloseDate
        ? new Date(dto.expectedCloseDate)
        : null;

    // Перемещение между стадиями: won/lost статус выставляется по флагам стадии
    if (dto.stageId !== undefined && dto.stageId !== existing.stageId) {
      const stage = await this.stageRepo.findById(dto.stageId, accountId);
      if (!stage) throw new BadRequestException('Стадия не найдена');
      if (stage.isWon) {
        data.status = 'won';
        data.wonAt = new Date();
        data.lostAt = null;
      } else if (stage.isLost) {
        data.status = 'lost';
        data.lostAt = new Date();
        data.wonAt = null;
      } else {
        data.status = 'open';
        data.wonAt = null;
        data.lostAt = null;
      }
    }

    const updated = await this.repo.update(id, accountId, data);

    if (data.status === 'won' && existing.status !== 'won') {
      const amount = updated.amount ? Number(updated.amount) : 0;
      void this.notificationsClient.broadcast({
        accountId,
        roleIds: DEAL_ADMIN_ROLES,
        userIds: updated.assignedManagerId ? [updated.assignedManagerId] : [],
        excludeUserId: actorUserId,
        title: `Сделка выиграна: ${updated.title}`,
        message: amount ? `Сумма: ${amount.toLocaleString('ru-RU')} ₽` : undefined,
        notificationType: 'deal_won',
        priority: 2,
        channels: ['in_app'],
        actionUrl: `/dashboard/deals`,
        entityType: 'deal',
        entityId: updated.id,
      });
    }

    return updated;
  }

  async delete(id: number, accountId: number) {
    const existing = await this.repo.findById(id, accountId);
    if (!existing) throw new NotFoundException(`Deal #${id} not found`);
    await this.repo.delete(id, accountId);
    return { message: `Deal #${id} deleted` };
  }
}
