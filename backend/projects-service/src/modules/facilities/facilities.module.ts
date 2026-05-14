import { Module } from '@nestjs/common';
import { FacilitiesController } from './facilities.controller';
import { FacilitiesService } from './facilities.service';
import { FacilityRepository } from './repositories/facility.repository';

@Module({
  controllers: [FacilitiesController],
  providers: [FacilitiesService, FacilityRepository],
  exports: [FacilitiesService],
})
export class FacilitiesModule {}
