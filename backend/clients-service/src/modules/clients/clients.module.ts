import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { ClientsRepository } from './repositories/clients.repository';
import { NotificationsClientModule } from '../../common/notifications/notifications-client.module';
@Module({
  imports: [NotificationsClientModule],
  controllers: [ClientsController],
  providers: [ClientsService, ClientsRepository],
  exports: [ClientsService],
})
export class ClientsModule {}
