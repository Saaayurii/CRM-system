import { Module } from '@nestjs/common';
import { SettingsGatewayController } from './settings-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';
import { MaintenanceSubService } from '../../redis/maintenance-sub.service';

@Module({
  imports: [ProxyModule],
  controllers: [SettingsGatewayController],
  providers: [MaintenanceSubService],
})
export class SettingsGatewayModule {}
