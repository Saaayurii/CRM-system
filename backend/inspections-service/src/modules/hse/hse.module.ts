import { Module } from '@nestjs/common';
import {
  HseDashboardController,
  HseRisksController,
  HseIncidentsController,
  HsePermitsController,
  HseViolationsController,
  HseCorrectiveActionsController,
  HseMonitoringController,
} from './hse.controller';
import { HseService } from './hse.service';
import { HseRepository } from './repositories/hse.repository';

@Module({
  controllers: [
    HseDashboardController,
    HseRisksController,
    HseIncidentsController,
    HsePermitsController,
    HseViolationsController,
    HseCorrectiveActionsController,
    HseMonitoringController,
  ],
  providers: [HseService, HseRepository],
  exports: [HseService],
})
export class HseModule {}
