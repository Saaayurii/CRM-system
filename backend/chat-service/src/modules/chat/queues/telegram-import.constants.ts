/**
 * Queue/job names + payload type for the Telegram-import queue. Kept in a
 * dependency-free module so chat.service.ts doesn't import telegram-import.queue.ts
 * (which imports ChatService back) — that circular import is fragile and would
 * crash the service at runtime the moment the wrong class is injected directly.
 */
export const TG_IMPORT_QUEUE = 'telegram-import';
export const TG_IMPORT_JOB_CHUNK = 'import-chunk';

/** Messages per job — bounds each job's Redis payload and DB batch size. */
export const TG_IMPORT_CHUNK = 100;

export interface TelegramImportChunkJob {
  channelId: number;
  userId: number;
  messages: any[];
}
