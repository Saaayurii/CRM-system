import { Module } from '@nestjs/common';
import { InspectionsController, InspectionTemplatesController } from './inspections.controller';
import { InspectionsService } from './inspections.service';
import { InspectionRepository } from './repositories/inspection.repository';

@Module({
  controllers: [InspectionsController, InspectionTemplatesController],
  providers: [InspectionsService, InspectionRepository],
  exports: [InspectionsService],
})
export class InspectionsModule {}
