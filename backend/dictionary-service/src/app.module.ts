import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { JwtStrategy } from './common/guards/jwt.strategy';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DictionaryTypesModule } from './modules/dictionary-types/dictionary-types.module';
import { DictionaryValuesModule } from './modules/dictionary-values/dictionary-values.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    DatabaseModule,
    DictionaryTypesModule,
    DictionaryValuesModule,
    HealthModule,
  ],
  providers: [
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
