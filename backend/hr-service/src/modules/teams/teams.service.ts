import { Injectable, NotFoundException } from '@nestjs/common';
import { TeamRepository } from './repositories/team.repository';
import { CreateTeamDto, UpdateTeamDto } from './dto';

@Injectable()
export class TeamsService {
  constructor(private readonly repository: TeamRepository) {}

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
  ) {
    const member = await this.repository.addMember(teamId, accountId, data);
    if (!member) throw new NotFoundException(`Team #${teamId} not found`);
    return member;
  }

  async removeMember(teamId: number, accountId: number, userId: number) {
    const result = await this.repository.removeMember(teamId, accountId, userId);
    if (!result) throw new NotFoundException(`Team #${teamId} not found`);
    return result;
  }
}
