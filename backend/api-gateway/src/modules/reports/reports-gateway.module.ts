import { Module } from '@nestjs/common';
import { ReportsGatewayController } from './reports-gateway.controller';
import { ReportsUploadController } from './reports-upload.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [ReportsGatewayController, ReportsUploadController],
})
export class ReportsGatewayModule {}
