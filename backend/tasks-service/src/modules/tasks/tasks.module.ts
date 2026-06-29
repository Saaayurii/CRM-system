import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskRepository } from './repositories/task.repository';
import { NotificationsClientService } from './notifications-client.service';
import { OutboxService } from '../../common/outbox/outbox.service';

@Module({
  imports: [ConfigModule],
  controllers: [TasksController],
  providers: [TasksService, TaskRepository, NotificationsClientService, OutboxService],
  exports: [TasksService],
})
export class TasksModule {}
