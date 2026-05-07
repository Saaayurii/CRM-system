import { Module } from '@nestjs/common';
import { AuthGatewayController } from './auth-gateway.controller';
import { AccountsGatewayController } from './accounts-gateway.controller';

@Module({
  controllers: [AuthGatewayController, AccountsGatewayController],
})
export class AuthGatewayModule {}
