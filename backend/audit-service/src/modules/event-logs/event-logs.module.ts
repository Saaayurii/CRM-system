import { Module } from '@nestjs/common';
import { EventLogsController } from './event-logs.controller';
import { EventLogsService } from './event-logs.service';
import { EventLogRepository } from './repositories/event-log.repository';
import { AuditConsumerService } from './kafka/audit-consumer.service';
import { KafkaProducerService } from './kafka/kafka-producer.service';
import { RowHistoryRelayService } from './kafka/row-history-relay.service';
import { OutboxRelayService } from './kafka/outbox-relay.service';

@Module({
  controllers: [EventLogsController],
  providers: [
    EventLogsService,
    EventLogRepository,
    AuditConsumerService,
    KafkaProducerService,
    RowHistoryRelayService,
    OutboxRelayService,
  ],
  exports: [EventLogsService],
})
export class EventLogsModule {}
