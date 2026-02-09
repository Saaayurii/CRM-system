import { Module } from '@nestjs/common';
import { TimeOffController } from './time-off.controller';
import { TimeOffService } from './time-off.service';
import { TimeOffRepository } from './repositories/time-off.repository';

@Module({
  controllers: [TimeOffController],
  providers: [TimeOffService, TimeOffRepository],
  exports: [TimeOffService],
})
export class TimeOffModule {}
