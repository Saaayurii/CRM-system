import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import configuration from './config/configuration';
import { ProxyModule } from './common/services/proxy.module';
import { AuthGatewayModule } from './modules/auth/auth-gateway.module';
import { UsersGatewayModule } from './modules/users/users-gateway.module';
import { ProjectsGatewayModule } from './modules/projects/projects-gateway.module';
import { TasksGatewayModule } from './modules/tasks/tasks-gateway.module';
import { MaterialsGatewayModule } from './modules/materials/materials-gateway.module';
import { SuppliersGatewayModule } from './modules/suppliers/suppliers-gateway.module';
import { FinanceGatewayModule } from './modules/finance/finance-gateway.module';
import { InspectionsGatewayModule } from './modules/inspections/inspections-gateway.module';
import { HrGatewayModule } from './modules/hr/hr-gateway.module';
import { NotificationsGatewayModule } from './modules/notifications/notifications-gateway.module';
import { ChatGatewayModule } from './modules/chat/chat-gateway.module';
import { CalendarGatewayModule } from './modules/calendar/calendar-gateway.module';
import { EquipmentGatewayModule } from './modules/equipment/equipment-gateway.module';
import { DocumentsGatewayModule } from './modules/documents/documents-gateway.module';
import { ReportsGatewayModule } from './modules/reports/reports-gateway.module';
import { DictionaryGatewayModule } from './modules/dictionary/dictionary-gateway.module';
import { AuditGatewayModule } from './modules/audit/audit-gateway.module';
import { ClientsGatewayModule } from './modules/clients/clients-gateway.module';
import { WikiGatewayModule } from './modules/wiki/wiki-gateway.module';
import { TrainingGatewayModule } from './modules/training/training-gateway.module';
import { AutomationGatewayModule } from './modules/automation/automation-gateway.module';
import { SettingsGatewayModule } from './modules/settings/settings-gateway.module';
import { DashboardGatewayModule } from './modules/dashboard/dashboard-gateway.module';
import { HealthModule } from './modules/health/health.module';
import { JwtStrategy } from './common/guards/jwt.strategy';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { GatewayExceptionFilter } from './common/filters/gateway-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: (configService.get<number>('rateLimit.ttl') || 60) * 1000,
            limit: configService.get<number>('rateLimit.max') || 100,
          },
        ],
      }),
    }),

    // Authentication
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('jwt.accessSecret') || 'default-secret',
      }),
    }),

    // Proxy Service
    ProxyModule,

    // Feature Modules
    AuthGatewayModule,
    UsersGatewayModule,
    ProjectsGatewayModule,
    TasksGatewayModule,
    MaterialsGatewayModule,
    SuppliersGatewayModule,
    FinanceGatewayModule,
    InspectionsGatewayModule,
    HrGatewayModule,
    NotificationsGatewayModule,
    ChatGatewayModule,
    CalendarGatewayModule,
    EquipmentGatewayModule,
    DocumentsGatewayModule,
    ReportsGatewayModule,
    DictionaryGatewayModule,
    AuditGatewayModule,
    ClientsGatewayModule,
    WikiGatewayModule,
    TrainingGatewayModule,
    AutomationGatewayModule,
    SettingsGatewayModule,
    DashboardGatewayModule,
    HealthModule,
  ],
  providers: [
    JwtStrategy,
    // Global Guards
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global Filters
    {
      provide: APP_FILTER,
      useClass: GatewayExceptionFilter,
    },
    // Global Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
