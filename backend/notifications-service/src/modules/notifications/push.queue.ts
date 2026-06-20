import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, forwardRef, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationsService } from './notifications.service';
import { PUSH_QUEUE, PUSH_JOB_SEND, PushJob } from './notifications.constants';

/**
 * Delivers Web Push notifications via BullMQ. Web Push fan-out used to be a
 * fire-and-forget `void` call; moving it to a queue gives retries on transient
 * push-service failures and survives process restarts.
 */
@Processor(PUSH_QUEUE)
export class PushProcessor extends WorkerHost {
  private readonly logger = new Logger(PushProcessor.name);

  constructor(
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== PUSH_JOB_SEND) {
      this.logger.warn(`Unknown push job: ${job.name}`);
      return;
    }
    const { userId, notification } = job.data as PushJob;
    await this.notificationsService.sendWebPushToUser(userId, notification);
  }
}
