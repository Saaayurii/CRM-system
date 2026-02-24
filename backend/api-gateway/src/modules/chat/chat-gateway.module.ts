import { Module } from '@nestjs/common';
import { ChatGatewayController } from './chat-gateway.controller';
import { ChatUploadController } from './chat-upload.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [ChatGatewayController, ChatUploadController],
})
export class ChatGatewayModule {}
