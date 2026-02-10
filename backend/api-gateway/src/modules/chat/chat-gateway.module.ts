import { Module } from '@nestjs/common';
import { ChatGatewayController } from './chat-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [ChatGatewayController],
})
export class ChatGatewayModule {}
