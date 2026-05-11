import { Module } from '@nestjs/common';
import { AuthGatewayController } from './auth-gateway.controller';
import { AccountsGatewayController } from './accounts-gateway.controller';
import { LogoUploadController } from './logo-upload.controller';

@Module({
  controllers: [AuthGatewayController, AccountsGatewayController, LogoUploadController],
})
export class AuthGatewayModule {}
