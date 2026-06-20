import { Module } from '@nestjs/common';
import { EventLogsController } from './event-logs.controller';
import { EventLogsService } from './event-logs.service';
import { EventLogRepository } from './repositories/event-log.repository';
import { AuditConsumerService } from './kafka/audit-consumer.service';

@Module({
  controllers: [EventLogsController],
  providers: [EventLogsService, EventLogRepository, AuditConsumerService],
  exports: [EventLogsService],
})
export class EventLogsModule {}
