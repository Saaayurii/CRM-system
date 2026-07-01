import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatRepository } from './repositories/chat.repository';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';
import { NotificationsClientService } from './notifications-client.service';
import { TelegramImportProcessor } from './queues/telegram-import.queue';
import { TG_IMPORT_QUEUE } from './queues/telegram-import.constants';
import { ScheduledMessagesService } from './scheduled-messages.service';
import { ScheduledMessagesProcessor } from './queues/scheduled-messages.queue';
import { SCHEDULED_MESSAGES_QUEUE } from './queues/scheduled-messages.constants';

@Module({
  imports: [
    ConfigModule,
    // BullMQ shared Redis connection + the Telegram-import queue.
    BullModule.forRootAsync({
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
    BullModule.registerQueue({ name: TG_IMPORT_QUEUE }),
    BullModule.registerQueue({ name: SCHEDULED_MESSAGES_QUEUE }),
  ],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService, ChatRepository, WsJwtGuard, NotificationsClientService, TelegramImportProcessor, ScheduledMessagesService, ScheduledMessagesProcessor],
  exports: [ChatService],
})
export class ChatModule {}
