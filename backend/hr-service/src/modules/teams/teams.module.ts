import { Module } from '@nestjs/common';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { TeamRepository } from './repositories/team.repository';

@Module({
  controllers: [TeamsController],
  providers: [TeamsService, TeamRepository],
  exports: [TeamsService],
})
export class TeamsModule {}
