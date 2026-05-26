import { Module } from '@nestjs/common';
import { HseGatewayController } from './hse-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [HseGatewayController],
})
export class HseGatewayModule {}
