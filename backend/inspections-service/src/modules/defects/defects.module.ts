import { Module } from '@nestjs/common';
import { DefectsController, DefectTemplatesController } from './defects.controller';
import { DefectsService } from './defects.service';
import { DefectRepository } from './repositories/defect.repository';

@Module({
  controllers: [DefectsController, DefectTemplatesController],
  providers: [DefectsService, DefectRepository],
  exports: [DefectsService],
})
export class DefectsModule {}
