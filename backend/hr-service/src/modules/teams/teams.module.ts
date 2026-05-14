import { Module } from '@nestjs/common';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { TeamRepository } from './repositories/team.repository';
import { NotificationsClientService } from './notifications-client.service';

@Module({
  controllers: [TeamsController],
  providers: [TeamsService, TeamRepository, NotificationsClientService],
  exports: [TeamsService],
})
export class TeamsModule {}
