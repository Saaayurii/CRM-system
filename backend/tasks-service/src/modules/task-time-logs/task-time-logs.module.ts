import { Module } from '@nestjs/common';
import { TaskTimeLogsController } from './task-time-logs.controller';
import { TaskTimeLogsService } from './task-time-logs.service';
import { TaskTimeLogRepository } from './repositories/task-time-log.repository';

@Module({
  controllers: [TaskTimeLogsController],
  providers: [TaskTimeLogsService, TaskTimeLogRepository],
  exports: [TaskTimeLogsService],
})
export class TaskTimeLogsModule {}
