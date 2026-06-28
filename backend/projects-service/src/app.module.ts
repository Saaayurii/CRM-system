import { Module } from '@nestjs/common';
import { NestModule, MiddlewareConsumer } from '@nestjs/common';
import { UserContextMiddleware } from './common/context/user-context.middleware';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ConstructionSitesModule } from './modules/construction-sites/construction-sites.module';
import { UserAssignmentsModule } from './modules/user-assignments/user-assignments.module';
import { HealthModule } from './modules/health/health.module';
import { BuildingObjectsModule } from './modules/building-objects/building-objects.module';
import { FacilitiesModule } from './modules/facilities/facilities.module';
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
    ProjectsModule,
    ConstructionSitesModule,
    UserAssignmentsModule,
    HealthModule,
    BuildingObjectsModule,
    FacilitiesModule,
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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(UserContextMiddleware).forRoutes('*');
  }
}
