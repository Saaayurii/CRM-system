import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from '../services/mail.service';

/** Name of the BullMQ queue handling outgoing email (off the request thread). */
export const MAIL_QUEUE = 'mail';

/** Job name + payload for a password-reset email. */
export const MAIL_JOB_PASSWORD_RESET = 'password-reset';
export interface PasswordResetMailJob {
  to: string;
  resetUrl: string;
  accountsCount: number;
  expiresMinutes: number;
}

/**
 * Processes queued email jobs. Runs inside the auth-service process as a BullMQ
 * worker. Throwing makes BullMQ retry the job (per the attempts/backoff set when
 * it was enqueued); returning normally marks it done.
 */
@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case MAIL_JOB_PASSWORD_RESET: {
        const d = job.data as PasswordResetMailJob;
        const sent = await this.mailService.sendPasswordReset(
          d.to,
          d.resetUrl,
          d.accountsCount,
          d.expiresMinutes,
        );
        // SMTP configured but the send failed → throw so BullMQ retries.
        // SMTP disabled (link logged) → treat as done, nothing to retry.
        if (!sent && this.mailService.isEnabled) {
          throw new Error(`Password-reset email to ${d.to} failed to send`);
        }
        return;
      }
      default:
        this.logger.warn(`Unknown mail job: ${job.name}`);
    }
  }
}
