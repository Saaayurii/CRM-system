import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatRepository } from './repositories/chat.repository';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';
import { NotificationsClientService } from './notifications-client.service';

@Module({
  imports: [ConfigModule],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService, ChatRepository, WsJwtGuard, NotificationsClientService],
  exports: [ChatService],
})
export class ChatModule {}
