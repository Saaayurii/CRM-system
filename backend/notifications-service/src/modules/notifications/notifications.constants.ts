/**
 * Queue/job names + payload types shared between NotificationsService and the
 * BullMQ processors. Kept in a dependency-free module so service files don't
 * import the `*.queue.ts` files (which import the services back) — that circular
 * import made injected dependencies resolve to `undefined` at runtime.
 */

// Web Push queue
export const PUSH_QUEUE = 'push';
export const PUSH_JOB_SEND = 'send';
export interface PushJob {
  userId: number;
  notification: any;
}

// Background jobs queue (housekeeping, reminders, broadcast fan-out)
export const JOBS_QUEUE = 'notifications-jobs';
export const JOB_CLEANUP = 'cleanup';
export const JOB_REMINDERS = 'reminders';
export const JOB_BROADCAST = 'broadcast';
