import { Module } from '@nestjs/common';
import { AutomationGatewayController } from './automation-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [AutomationGatewayController],
})
export class AutomationGatewayModule {}
