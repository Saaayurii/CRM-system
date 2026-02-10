import { Module } from '@nestjs/common';
import { MaterialsGatewayController } from './materials-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [MaterialsGatewayController],
})
export class MaterialsGatewayModule {}
