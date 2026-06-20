import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PasswordResetRepository } from '../repositories/password-reset.repository';
import { SessionRepository } from '../repositories/session.repository';

/** Queue + job for periodic DB housekeeping in auth-service. */
export const MAINTENANCE_QUEUE = 'maintenance';
export const MAINTENANCE_JOB_CLEANUP = 'cleanup';

/** Repeatable schedule: run the cleanup once a day. */
const CLEANUP_EVERY_MS = 24 * 60 * 60 * 1000;

/**
 * Periodically purges rows that are no longer useful:
 *  - spent password-reset tokens (expired or already used)
 *  - expired user sessions (across all users)
 *
 * The repeatable job is (re)registered on boot; BullMQ dedupes by jobId so
 * multiple instances/restarts don't create duplicate schedules.
 */
@Processor(MAINTENANCE_QUEUE)
export class MaintenanceProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(MaintenanceProcessor.name);

  constructor(
    @InjectQueue(MAINTENANCE_QUEUE) private readonly queue: Queue,
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly sessionRepository: SessionRepository,
  ) {
    super();
  }

  async onModuleInit() {
    try {
      await this.queue.add(
        MAINTENANCE_JOB_CLEANUP,
        {},
        {
          jobId: 'auth-cleanup-daily',
          repeat: { every: CLEANUP_EVERY_MS },
          removeOnComplete: true,
          removeOnFail: 50,
        },
      );
    } catch (err) {
      this.logger.warn(`Could not schedule cleanup job: ${(err as Error).message}`);
    }
  }

  async process(job: Job): Promise<void> {
    if (job.name !== MAINTENANCE_JOB_CLEANUP) return;
    const tokens = await this.passwordResetRepository.deleteSpent();
    const sessions = await this.sessionRepository.deleteAllExpired();
    this.logger.log(
      `Cleanup done: removed ${tokens} spent reset token(s), ${sessions} expired session(s)`,
    );
  }
}
