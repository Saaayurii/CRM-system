import { Module } from '@nestjs/common';
import { SystemSettingsController } from './system-settings.controller';
import { SystemSettingsService } from './system-settings.service';
import { SystemSettingsRepository } from './repositories/system-settings.repository';
import { RedisPublisherService } from '../../redis/redis-publisher.service';

@Module({
  controllers: [SystemSettingsController],
  providers: [SystemSettingsService, SystemSettingsRepository, RedisPublisherService],
  exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
