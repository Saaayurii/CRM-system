import { Module } from '@nestjs/common';
import { SettingsGatewayController } from './settings-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [SettingsGatewayController],
})
export class SettingsGatewayModule {}
