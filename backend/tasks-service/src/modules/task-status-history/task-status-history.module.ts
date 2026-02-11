import { Module } from '@nestjs/common';
import { TaskStatusHistoryController } from './task-status-history.controller';
import { TaskStatusHistoryService } from './task-status-history.service';
import { TaskStatusHistoryRepository } from './repositories/task-status-history.repository';

@Module({
  controllers: [TaskStatusHistoryController],
  providers: [TaskStatusHistoryService, TaskStatusHistoryRepository],
  exports: [TaskStatusHistoryService],
})
export class TaskStatusHistoryModule {}
