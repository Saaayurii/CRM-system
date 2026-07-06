import { Module } from '@nestjs/common';
import { NotificationsGatewayController } from './notifications-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [NotificationsGatewayController],
})
export class NotificationsGatewayModule {}
