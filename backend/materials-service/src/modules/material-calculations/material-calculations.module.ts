import { Module } from '@nestjs/common';
import { MaterialCalculationsController } from './material-calculations.controller';
import { MaterialCalculationsService } from './material-calculations.service';
import { MaterialCalculationRepository } from './repositories/material-calculation.repository';

@Module({
  controllers: [MaterialCalculationsController],
  providers: [MaterialCalculationsService, MaterialCalculationRepository],
  exports: [MaterialCalculationsService],
})
export class MaterialCalculationsModule {}
