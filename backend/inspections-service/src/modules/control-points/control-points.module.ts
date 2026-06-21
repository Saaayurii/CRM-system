import { Module } from '@nestjs/common';
import { ControlPointsController } from './control-points.controller';
import { ControlPointsService } from './control-points.service';
import { ControlPointRepository } from './repositories/control-point.repository';

@Module({
  controllers: [ControlPointsController],
  providers: [ControlPointsService, ControlPointRepository],
  exports: [ControlPointsService],
})
export class ControlPointsModule {}
