import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EstimatesController } from './estimates.controller';
import { EstimatesService } from './estimates.service';
import { EstimateExportService } from './estimate-export.service';

@Module({
  imports: [HttpModule.register({ timeout: 15000 })],
  controllers: [EstimatesController],
  providers: [EstimatesService, EstimateExportService],
  exports: [EstimatesService],
})
export class EstimatesModule {}
