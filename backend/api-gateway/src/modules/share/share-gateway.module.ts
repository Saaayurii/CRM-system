import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ShareGatewayController } from './share-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [
    ProxyModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('jwt.accessSecret') || 'default-secret',
      }),
    }),
  ],
  controllers: [ShareGatewayController],
})
export class ShareGatewayModule {}
