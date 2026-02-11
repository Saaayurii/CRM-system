import { Module } from '@nestjs/common';
import { TeamMembersController } from './team-members.controller';
import { TeamMembersService } from './team-members.service';
import { TeamMemberRepository } from './repositories/team-member.repository';

@Module({
  controllers: [TeamMembersController],
  providers: [TeamMembersService, TeamMemberRepository],
  exports: [TeamMembersService],
})
export class TeamMembersModule {}
