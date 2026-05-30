import { Module } from '@nestjs/common';
import { MaterialRequestsController } from './material-requests.controller';
import { MaterialRequestsService } from './material-requests.service';
import { MaterialRequestRepository } from './repositories/material-request.repository';
import { NotificationsClientModule } from '../../common/notifications/notifications-client.module';

@Module({
  imports: [NotificationsClientModule],
  controllers: [MaterialRequestsController],
  providers: [MaterialRequestsService, MaterialRequestRepository],
  exports: [MaterialRequestsService],
})
export class MaterialRequestsModule {}
