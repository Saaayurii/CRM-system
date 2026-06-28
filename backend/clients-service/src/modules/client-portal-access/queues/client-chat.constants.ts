/**
 * Queue/job names + payload for the client-portal chat-channel queue. Kept in a
 * dependency-free module so client-portal-access.service.ts doesn't import the
 * processor (which imports the service back) — that circular import is fragile.
 */
export const CLIENT_CHAT_QUEUE = 'client-chat';
export const CLIENT_CHAT_JOB_CREATE = 'create-channel';

export interface CreateClientChatJob {
  clientId: number;
  projectId: number;
  clientUserId?: number;
  /** Bearer token of the actor — chat-service authorizes channel creation with it. */
  authHeader: string;
}
