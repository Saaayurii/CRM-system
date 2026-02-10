import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatRepository } from './repositories/chat.repository';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';

@Module({
  imports: [ConfigModule],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService, ChatRepository, WsJwtGuard],
  exports: [ChatService],
})
export class ChatModule {}
