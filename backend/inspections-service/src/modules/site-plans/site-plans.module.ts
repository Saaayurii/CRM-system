import { Module } from '@nestjs/common';
import { SitePlansController } from './site-plans.controller';
import { SitePlansService } from './site-plans.service';
import { SitePlanRepository } from './repositories/site-plan.repository';

@Module({
  controllers: [SitePlansController],
  providers: [SitePlansService, SitePlanRepository],
  exports: [SitePlansService],
})
export class SitePlansModule {}
