import { Module } from '@nestjs/common';
import { ClientsGatewayController } from './clients-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [ClientsGatewayController],
})
export class ClientsGatewayModule {}
