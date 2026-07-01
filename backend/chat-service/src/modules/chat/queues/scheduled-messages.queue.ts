import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, forwardRef, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { ScheduledMessagesService } from '../scheduled-messages.service';
import {
  SCHEDULED_MESSAGES_QUEUE,
  SCHEDULED_MESSAGE_JOB_DELIVER,
  ScheduledMessageDeliverJob,
} from './scheduled-messages.constants';

/**
 * Доставляет отложенное сообщение в назначенное время (delayed job).
 */
@Processor(SCHEDULED_MESSAGES_QUEUE)
export class ScheduledMessagesProcessor extends WorkerHost {
  private readonly logger = new Logger(ScheduledMessagesProcessor.name);

  constructor(
    @Inject(forwardRef(() => ScheduledMessagesService))
    private readonly scheduledService: ScheduledMessagesService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== SCHEDULED_MESSAGE_JOB_DELIVER) {
      this.logger.warn(`Unknown scheduled-messages job: ${job.name}`);
      return;
    }
    const { scheduledId } = job.data as ScheduledMessageDeliverJob;
    await this.scheduledService.deliver(scheduledId);
  }
}
