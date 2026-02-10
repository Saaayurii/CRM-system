import { Module } from '@nestjs/common';
import { HrGatewayController } from './hr-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [HrGatewayController],
})
export class HrGatewayModule {}
