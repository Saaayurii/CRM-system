import { Module } from '@nestjs/common';
import { InspectionsGatewayController } from './inspections-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [InspectionsGatewayController],
})
export class InspectionsGatewayModule {}
