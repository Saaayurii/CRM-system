import { Module } from '@nestjs/common';
import { AuditGatewayController } from './audit-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [AuditGatewayController],
})
export class AuditGatewayModule {}
