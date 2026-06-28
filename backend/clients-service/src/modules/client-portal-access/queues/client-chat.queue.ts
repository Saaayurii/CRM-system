import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, forwardRef, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { ClientPortalAccessService } from '../client-portal-access.service';
import {
  CLIENT_CHAT_QUEUE,
  CLIENT_CHAT_JOB_CREATE,
  CreateClientChatJob,
} from './client-chat.constants';

/**
 * Creates the "Клиент — {project}" chat channel for a newly granted portal
 * access. Runs off the request thread with retries so portal creation never
 * blocks on (or fails because of) chat-service availability.
 */
@Processor(CLIENT_CHAT_QUEUE)
export class ClientChatProcessor extends WorkerHost {
  private readonly logger = new Logger(ClientChatProcessor.name);

  constructor(
    @Inject(forwardRef(() => ClientPortalAccessService))
    private readonly portalService: ClientPortalAccessService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== CLIENT_CHAT_JOB_CREATE) {
      this.logger.warn(`Unknown client-chat job: ${job.name}`);
      return;
    }
    const { clientId, projectId, clientUserId, authHeader } =
      job.data as CreateClientChatJob;
    await this.portalService.createClientChannel(
      clientId,
      projectId,
      clientUserId,
      authHeader,
    );
  }
}
