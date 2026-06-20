import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, forwardRef, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { ChatService } from '../chat.service';

/** Queue + job for importing Telegram-export messages off the request thread. */
export const TG_IMPORT_QUEUE = 'telegram-import';
export const TG_IMPORT_JOB_CHUNK = 'import-chunk';

/** Messages per job — bounds each job's Redis payload and DB batch size. */
export const TG_IMPORT_CHUNK = 100;

export interface TelegramImportChunkJob {
  channelId: number;
  userId: number;
  messages: any[];
}

/**
 * Inserts a chunk of imported Telegram messages. The channel is created
 * synchronously in ChatService.importTelegram; the (potentially thousands of)
 * messages are split into chunk jobs and inserted here with retries.
 */
@Processor(TG_IMPORT_QUEUE)
export class TelegramImportProcessor extends WorkerHost {
  private readonly logger = new Logger(TelegramImportProcessor.name);

  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== TG_IMPORT_JOB_CHUNK) {
      this.logger.warn(`Unknown telegram-import job: ${job.name}`);
      return;
    }
    const { channelId, userId, messages } = job.data as TelegramImportChunkJob;
    await this.chatService.insertTelegramMessages(channelId, userId, messages);
  }
}
