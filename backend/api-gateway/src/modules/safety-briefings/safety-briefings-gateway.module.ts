import { Module } from '@nestjs/common';
import { SafetyBriefingsGatewayController } from './safety-briefings-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [SafetyBriefingsGatewayController],
})
export class SafetyBriefingsGatewayModule {}
