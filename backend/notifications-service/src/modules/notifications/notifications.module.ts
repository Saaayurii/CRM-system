import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationRepository } from './repositories/notification.repository';
import { PushProcessor } from './push.queue';
import { ReminderService } from './reminder.service';
import { JobsProcessor } from './jobs.queue';
import { PUSH_QUEUE, JOBS_QUEUE } from './notifications.constants';

@Module({
  imports: [
    // BullMQ shared Redis connection + the "push" queue (Web Push off the request thread).
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
    BullModule.registerQueue({ name: PUSH_QUEUE }),
    BullModule.registerQueue({ name: JOBS_QUEUE }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationRepository,
    PushProcessor,
    ReminderService,
    JobsProcessor,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
