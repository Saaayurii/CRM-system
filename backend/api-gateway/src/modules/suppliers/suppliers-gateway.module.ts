import { Module } from '@nestjs/common';
import { SuppliersGatewayController } from './suppliers-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [SuppliersGatewayController],
})
export class SuppliersGatewayModule {}
