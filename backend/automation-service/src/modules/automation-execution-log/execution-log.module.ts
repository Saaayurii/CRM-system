import { Module } from '@nestjs/common';
import { ExecutionLogController } from './execution-log.controller';
import { ExecutionLogService } from './execution-log.service';
import { ExecutionLogRepository } from './repositories/execution-log.repository';
@Module({
  controllers: [ExecutionLogController],
  providers: [ExecutionLogService, ExecutionLogRepository],
  exports: [ExecutionLogService],
})
export class ExecutionLogModule {}
