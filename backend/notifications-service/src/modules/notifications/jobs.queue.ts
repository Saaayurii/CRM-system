import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger, OnModuleInit, forwardRef, Inject } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { NotificationRepository } from './repositories/notification.repository';
import { ReminderService } from './reminder.service';
import { NotificationsService } from './notifications.service';
import {
  JOBS_QUEUE,
  JOB_CLEANUP,
  JOB_REMINDERS,
  JOB_BROADCAST,
} from './notifications.constants';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Read notifications older than this are purged by the cleanup job. */
const READ_RETENTION_DAYS = 30;

@Processor(JOBS_QUEUE)
export class JobsProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(JobsProcessor.name);

  constructor(
    @InjectQueue(JOBS_QUEUE) private readonly queue: Queue,
    private readonly notificationRepository: NotificationRepository,
    private readonly reminderService: ReminderService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async onModuleInit() {
    try {
      await this.queue.add(
        JOB_CLEANUP,
        {},
        { jobId: 'notif-cleanup-daily', repeat: { every: DAY_MS }, removeOnComplete: true, removeOnFail: 50 },
      );
      await this.queue.add(
        JOB_REMINDERS,
        {},
        { jobId: 'notif-reminders-daily', repeat: { every: DAY_MS }, removeOnComplete: true, removeOnFail: 50 },
      );
    } catch (err) {
      this.logger.warn(`Could not schedule repeatable jobs: ${(err as Error).message}`);
    }
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_CLEANUP: {
        const removed = await this.notificationRepository.deleteReadOlderThan(READ_RETENTION_DAYS);
        this.logger.log(`Cleanup: removed ${removed} old read notification(s)`);
        return;
      }
      case JOB_REMINDERS:
        await this.reminderService.runAll();
        return;
      case JOB_BROADCAST:
        await this.notificationsService.runBroadcast(job.data);
        return;
      default:
        this.logger.warn(`Unknown job: ${job.name}`);
    }
  }
}
