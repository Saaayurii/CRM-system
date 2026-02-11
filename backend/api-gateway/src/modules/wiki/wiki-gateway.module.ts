import { Module } from '@nestjs/common';
import { WikiGatewayController } from './wiki-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [WikiGatewayController],
})
export class WikiGatewayModule {}
