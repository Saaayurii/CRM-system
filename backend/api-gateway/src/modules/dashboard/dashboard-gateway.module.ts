import { Module } from '@nestjs/common';
import { DashboardGatewayController } from './dashboard-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [DashboardGatewayController],
})
export class DashboardGatewayModule {}
