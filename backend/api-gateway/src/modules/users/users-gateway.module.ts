import { Module } from '@nestjs/common';
import { UsersGatewayController } from './users-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [UsersGatewayController],
})
export class UsersGatewayModule {}
