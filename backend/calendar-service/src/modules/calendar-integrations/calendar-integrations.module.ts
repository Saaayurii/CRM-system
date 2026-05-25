import { Module } from '@nestjs/common';
import { CalendarIntegrationsController } from './calendar-integrations.controller';
import { CalendarIntegrationsService } from './calendar-integrations.service';
import { GoogleCalendarProvider } from './providers/google.provider';
import { CalDavProvider } from './providers/caldav.provider';

@Module({
  controllers: [CalendarIntegrationsController],
  providers: [CalendarIntegrationsService, GoogleCalendarProvider, CalDavProvider],
  exports: [CalendarIntegrationsService, GoogleCalendarProvider, CalDavProvider],
})
export class CalendarIntegrationsModule {}
