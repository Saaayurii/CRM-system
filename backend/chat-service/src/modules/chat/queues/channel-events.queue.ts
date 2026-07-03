import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ChatRepository } from '../repositories/chat.repository';
import { KafkaProducerService } from '../../../common/services/kafka-producer.service';
import {
  CHANNEL_EVENTS_QUEUE,
  CHANNEL_EVENT_JOB,
  ChannelEventJob,
} from './channel-events.constants';

/**
 * Пишет действие админа в chat_channel_events (с ретраями BullMQ) и best-effort
 * публикует его в Kafka `audit.events`, чтобы automation-service мог реагировать
 * (напр. правило «уведомить при удалении участника»). Kafka-эмит не влияет на
 * успех задачи — журнал в БД первичен.
 */
@Processor(CHANNEL_EVENTS_QUEUE)
export class ChannelEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(ChannelEventsProcessor.name);

  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly kafka: KafkaProducerService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== CHANNEL_EVENT_JOB) {
      this.logger.warn(`Unknown channel-events job: ${job.name}`);
      return;
    }
    const d = job.data as ChannelEventJob;

    // 1) Первично — запись в БД (бросит исключение → BullMQ повторит).
    await this.chatRepository.insertChannelEvent(
      d.channelId,
      d.accountId,
      d.actorUserId,
      d.action,
      d.meta,
    );

    // 2) Best-effort фан-аут в Kafka для automation (не влияет на успех задачи).
    await this.kafka.emit('audit.events', {
      eventType: 'domain_event',
      accountId: d.accountId,
      userId: d.actorUserId,
      entityType: 'chat_channel',
      entityId: d.channelId,
      action: d.action,
      changes: d.meta,
      createdAt: new Date().toISOString(),
    });
  }
}
