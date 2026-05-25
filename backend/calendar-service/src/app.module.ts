import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { CalendarEventsModule } from './modules/calendar-events/calendar-events.module';
import { CustomEventTypesModule } from './modules/custom-event-types/custom-event-types.module';
import { CalendarFeedModule } from './modules/calendar-feed/calendar-feed.module';
import { CalendarIntegrationsModule } from './modules/calendar-integrations/calendar-integrations.module';
import { HealthModule } from './modules/health/health.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { JwtStrategy } from './common/guards/jwt.strategy';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    DatabaseModule,
    CalendarEventsModule,
    CustomEventTypesModule,
    CalendarFeedModule,
    CalendarIntegrationsModule,
    HealthModule,
  ],
  providers: [
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
