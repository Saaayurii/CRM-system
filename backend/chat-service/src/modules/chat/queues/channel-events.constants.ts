/**
 * Очередь журналирования действий админов канала («Недавние действия»).
 * Продьюсер (ChatService.logChannelEvent) кладёт задачу, воркер пишет строку в
 * chat_channel_events (с ретраями) и best-effort публикует событие в Kafka
 * `audit.events` для automation-service. Dependency-free, чтобы избежать
 * циклического импорта с ChatService.
 */
export const CHANNEL_EVENTS_QUEUE = 'channel-events';
export const CHANNEL_EVENT_JOB = 'log-channel-event';

export interface ChannelEventJob {
  channelId: number;
  accountId: number;
  actorUserId: number | null;
  action: string;
  meta: Record<string, unknown>;
}
