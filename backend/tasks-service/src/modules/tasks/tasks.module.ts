import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskRepository } from './repositories/task.repository';
import { NotificationsClientService } from './notifications-client.service';

@Module({
  imports: [ConfigModule],
  controllers: [TasksController],
  providers: [TasksService, TaskRepository, NotificationsClientService],
  exports: [TasksService],
})
export class TasksModule {}
