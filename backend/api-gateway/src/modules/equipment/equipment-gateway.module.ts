import { Module } from '@nestjs/common';
import { EquipmentGatewayController } from './equipment-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [EquipmentGatewayController],
})
export class EquipmentGatewayModule {}
