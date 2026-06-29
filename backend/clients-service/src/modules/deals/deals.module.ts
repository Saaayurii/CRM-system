import { Module } from '@nestjs/common';
import { DealsController } from './deals.controller';
import { DealStagesController } from './deal-stages.controller';
import { DealsService } from './deals.service';
import { DealStagesService } from './deal-stages.service';
import { DealRepository } from './repositories/deal.repository';
import { DealStageRepository } from './repositories/deal-stage.repository';
import { NotificationsClientModule } from '../../common/notifications/notifications-client.module';
import { OutboxService } from '../../common/outbox/outbox.service';

@Module({
  imports: [NotificationsClientModule],
  controllers: [DealsController, DealStagesController],
  providers: [
    DealsService,
    DealStagesService,
    DealRepository,
    DealStageRepository,
    OutboxService,
  ],
  exports: [DealsService],
})
export class DealsModule {}
