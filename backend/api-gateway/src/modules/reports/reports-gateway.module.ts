import { Module } from '@nestjs/common';
import { ReportsGatewayController } from './reports-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [ReportsGatewayController],
})
export class ReportsGatewayModule {}
