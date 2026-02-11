import { Module } from '@nestjs/common';
import { DocumentsGatewayController } from './documents-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [DocumentsGatewayController],
})
export class DocumentsGatewayModule {}
