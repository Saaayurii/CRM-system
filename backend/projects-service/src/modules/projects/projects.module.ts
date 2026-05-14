import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectRepository } from './repositories/project.repository';
import { NotificationsClientService } from './notifications-client.service';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectRepository, NotificationsClientService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
