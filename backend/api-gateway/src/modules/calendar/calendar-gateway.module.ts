import { Module } from '@nestjs/common';
import { CalendarGatewayController } from './calendar-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [CalendarGatewayController],
})
export class CalendarGatewayModule {}
