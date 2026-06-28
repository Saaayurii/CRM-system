import { Module } from '@nestjs/common';
import { NestModule, MiddlewareConsumer } from '@nestjs/common';
import { UserContextMiddleware } from './common/context/user-context.middleware';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { JwtStrategy } from './common/guards/jwt.strategy';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ClientsModule } from './modules/clients/clients.module';
import { ClientInteractionsModule } from './modules/client-interactions/client-interactions.module';
import { ClientPortalAccessModule } from './modules/client-portal-access/client-portal-access.module';
import { ClientInvitesModule } from './modules/client-invites/client-invites.module';
import { DealsModule } from './modules/deals/deals.module';
import { ShareLinksModule } from './modules/share-links/share-links.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    DatabaseModule,
    ClientsModule,
    ClientInteractionsModule,
    ClientPortalAccessModule,
    ClientInvitesModule,
    DealsModule,
    ShareLinksModule,
    HealthModule,
  ],
  providers: [
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(UserContextMiddleware).forRoutes('*');
  }
}
