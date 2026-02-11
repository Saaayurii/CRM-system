import { Injectable, NotFoundException } from '@nestjs/common';
import { TeamMemberRepository } from './repositories/team-member.repository';
import { CreateTeamMemberDto, UpdateTeamMemberDto } from './dto';

@Injectable()
export class TeamMembersService {
  constructor(private readonly repository: TeamMemberRepository) {}

  async findAll(page = 1, limit = 20, teamId?: number, userId?: number) {
    return this.repository.findAll(page, limit, teamId, userId);
  }

  async findById(id: number) {
    const member = await this.repository.findById(id);
    if (!member) throw new NotFoundException(`Team member #${id} not found`);
    return member;
  }

  async create(dto: CreateTeamMemberDto) {
    return this.repository.create(dto);
  }

  async update(id: number, dto: UpdateTeamMemberDto) {
    const member = await this.repository.update(id, dto);
    if (!member) throw new NotFoundException(`Team member #${id} not found`);
    return member;
  }

  async delete(id: number) {
    const member = await this.repository.delete(id);
    if (!member) throw new NotFoundException(`Team member #${id} not found`);
    return member;
  }
}
