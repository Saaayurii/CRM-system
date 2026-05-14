import { Injectable, NotFoundException } from '@nestjs/common';
import { TeamRepository } from './repositories/team.repository';
import { CreateTeamDto, UpdateTeamDto } from './dto';
import { NotificationsClientService } from './notifications-client.service';

@Injectable()
export class TeamsService {
  constructor(
    private readonly repository: TeamRepository,
    private readonly notificationsClient: NotificationsClientService,
  ) {}

  async findAll(accountId: number, page = 1, limit = 20, status?: number) {
    return this.repository.findAll(accountId, page, limit, status);
  }

  async findById(id: number, accountId: number) {
    const team = await this.repository.findById(id, accountId);
    if (!team) throw new NotFoundException(`Team #${id} not found`);
    return team;
  }

  async create(accountId: number, dto: CreateTeamDto) {
    return this.repository.create(accountId, dto);
  }

  async update(id: number, accountId: number, dto: UpdateTeamDto) {
    const team = await this.repository.update(id, accountId, dto);
    if (!team) throw new NotFoundException(`Team #${id} not found`);
    return team;
  }

  async delete(id: number, accountId: number) {
    const team = await this.repository.delete(id, accountId);
    if (!team) throw new NotFoundException(`Team #${id} not found`);
    return team;
  }

  async findMembers(id: number, accountId: number) {
    const members = await this.repository.findMembers(id, accountId);
    if (!members) throw new NotFoundException(`Team #${id} not found`);
    return members;
  }

  async addMember(
    teamId: number,
    accountId: number,
    data: { userId: number; roleInTeam?: string },
    requestingUserId?: number,
  ) {
    const member = await this.repository.addMember(teamId, accountId, data);
    if (!member) throw new NotFoundException(`Team #${teamId} not found`);

    if (data.userId !== requestingUserId) {
      try {
        const team = await this.repository.findById(teamId, accountId);
        const teamName = (team as any)?.name ?? `команду #${teamId}`;
        void this.notificationsClient.sendNotification({
          userId: data.userId,
          accountId,
          title: `Вас добавили в команду: ${teamName}`,
          message: 'Вы стали участником команды',
          notificationType: 'team_member_added',
          priority: 2,
          channels: ['in_app', 'push'],
          entityType: 'team',
          entityId: teamId,
        });
      } catch { /* skip notification on error */ }
    }

    return member;
  }

  async removeMember(
    teamId: number,
    accountId: number,
    userId: number,
    requestingUserId?: number,
  ) {
    if (userId !== requestingUserId) {
      try {
        const team = await this.repository.findById(teamId, accountId);
        const teamName = (team as any)?.name ?? `команде #${teamId}`;
        void this.notificationsClient.sendNotification({
          userId,
          accountId,
          title: `Вас убрали из команды: ${teamName}`,
          message: 'Вы больше не являетесь участником команды',
          notificationType: 'team_member_removed',
          priority: 2,
          channels: ['in_app'],
          entityType: 'team',
          entityId: teamId,
        });
      } catch { /* skip notification on error */ }
    }

    const result = await this.repository.removeMember(teamId, accountId, userId);
    if (!result) throw new NotFoundException(`Team #${teamId} not found`);
    return result;
  }
}
