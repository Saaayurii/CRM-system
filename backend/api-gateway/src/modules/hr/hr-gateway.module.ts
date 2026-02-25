import { Module } from '@nestjs/common';
import { HrGatewayController } from './hr-gateway.controller';
import { HrUploadController } from './hr-upload.controller';
import { AttendanceUploadController } from './attendance-upload.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [HrGatewayController, HrUploadController, AttendanceUploadController],
})
export class HrGatewayModule {}
