import { Module } from '@nestjs/common';
import { InspectionsGatewayController } from './inspections-gateway.controller';
import { InspectionsUploadController } from './inspections-upload.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [InspectionsGatewayController, InspectionsUploadController],
})
export class InspectionsGatewayModule {}
