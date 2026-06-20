import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, forwardRef, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { ChatService } from '../chat.service';
import {
  TG_IMPORT_QUEUE,
  TG_IMPORT_JOB_CHUNK,
  TelegramImportChunkJob,
} from './telegram-import.constants';

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
