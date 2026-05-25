import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CalendarFeedController } from './calendar-feed.controller';
import { CalendarFeedService } from './calendar-feed.service';

@Module({
  imports: [HttpModule.register({ timeout: 15000 })],
  controllers: [CalendarFeedController],
  providers: [CalendarFeedService],
  exports: [CalendarFeedService],
})
export class CalendarFeedModule {}
