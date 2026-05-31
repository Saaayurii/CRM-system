import { Module } from '@nestjs/common';
import { NotesGatewayController } from './notes-gateway.controller';
import { ProxyModule } from '../../common/services/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [NotesGatewayController],
})
export class NotesGatewayModule {}
