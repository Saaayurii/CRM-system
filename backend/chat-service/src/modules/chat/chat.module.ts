import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatRepository } from './repositories/chat.repository';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';
import { NotificationsClientService } from './notifications-client.service';
import { TelegramImportProcessor, TG_IMPORT_QUEUE } from './queues/telegram-import.queue';

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
  ],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService, ChatRepository, WsJwtGuard, NotificationsClientService, TelegramImportProcessor],
  exports: [ChatService],
})
export class ChatModule {}
