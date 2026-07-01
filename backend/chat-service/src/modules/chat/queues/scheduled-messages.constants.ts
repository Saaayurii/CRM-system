export const SCHEDULED_MESSAGES_QUEUE = 'scheduled-messages';
export const SCHEDULED_MESSAGE_JOB_DELIVER = 'deliver';

export interface ScheduledMessageDeliverJob {
  scheduledId: number;
}
