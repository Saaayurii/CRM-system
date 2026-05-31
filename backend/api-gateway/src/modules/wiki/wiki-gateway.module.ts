import { Module } from '@nestjs/common';
import { WikiGatewayController } from './wiki-gateway.controller';
import { ConstructionNormsGatewayController } from './construction-norms-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [WikiGatewayController, ConstructionNormsGatewayController],
})
export class WikiGatewayModule {}
