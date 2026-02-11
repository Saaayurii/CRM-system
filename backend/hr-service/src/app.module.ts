import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { EmployeeDocumentsModule } from './modules/employee-documents/employee-documents.module';
import { TimeOffModule } from './modules/time-off/time-off.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { SafetyModule } from './modules/safety/safety.module';
import { HealthModule } from './modules/health/health.module';
import { TeamsModule } from './modules/teams/teams.module';
import { TeamMembersModule } from './modules/team-members/team-members.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { JwtStrategy } from './common/guards/jwt.strategy';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    DatabaseModule,
    EmployeeDocumentsModule,
    TimeOffModule,
    AttendanceModule,
    SafetyModule,
    HealthModule,
    TeamsModule,
    TeamMembersModule,
  ],
  providers: [
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
