import { Module } from '@nestjs/common';
import { FinanceGatewayController } from './finance-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [FinanceGatewayController],
})
export class FinanceGatewayModule {}
