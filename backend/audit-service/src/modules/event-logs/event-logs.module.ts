import { Module } from '@nestjs/common';
import { EventLogsController } from './event-logs.controller';
import { EventLogsService } from './event-logs.service';
import { EventLogRepository } from './repositories/event-log.repository';

@Module({
  controllers: [EventLogsController],
  providers: [EventLogsService, EventLogRepository],
  exports: [EventLogsService],
})
export class EventLogsModule {}
