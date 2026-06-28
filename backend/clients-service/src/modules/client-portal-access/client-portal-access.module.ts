import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ClientPortalAccessController } from './client-portal-access.controller';
import { ClientPortalAccessService } from './client-portal-access.service';
import { ClientPortalAccessRepository } from './repositories/client-portal-access.repository';
import { ClientChatProcessor } from './queues/client-chat.queue';
import { CLIENT_CHAT_QUEUE } from './queues/client-chat.constants';

@Module({
  imports: [
    HttpModule.register({ timeout: 5000 }),
    // BullMQ shared Redis connection + the client-chat creation queue.
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host') || 'localhost',
          port: configService.get<number>('redis.port') || 6379,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      }),
    }),
    BullModule.registerQueue({ name: CLIENT_CHAT_QUEUE }),
  ],
  controllers: [ClientPortalAccessController],
  providers: [
    ClientPortalAccessService,
    ClientPortalAccessRepository,
    ClientChatProcessor,
  ],
  exports: [ClientPortalAccessService],
})
export class ClientPortalAccessModule {}
