import { Module } from '@nestjs/common';
import { UsersGatewayController } from './users-gateway.controller';
import { UsersUploadController } from './users-upload.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [UsersGatewayController, UsersUploadController],
})
export class UsersGatewayModule {}
