import { Module } from '@nestjs/common';
import { DictionaryGatewayController } from './dictionary-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [DictionaryGatewayController],
})
export class DictionaryGatewayModule {}
