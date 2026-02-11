import { Module } from '@nestjs/common';
import { ReportTemplatesController } from './report-templates.controller';
import { ReportTemplatesService } from './report-templates.service';
import { ReportTemplateRepository } from './repositories/report-template.repository';

@Module({
  controllers: [ReportTemplatesController],
  providers: [ReportTemplatesService, ReportTemplateRepository],
  exports: [ReportTemplatesService],
})
export class ReportTemplatesModule {}
