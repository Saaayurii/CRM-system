import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsGatewayController } from './notifications-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [
    ProxyModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessSecret') || 'default-secret',
      }),
    }),
  ],
  controllers: [NotificationsGatewayController],
})
export class NotificationsGatewayModule {}
