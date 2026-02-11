import { Module } from '@nestjs/common';
import { GeneratedReportsController } from './generated-reports.controller';
import { GeneratedReportsService } from './generated-reports.service';
import { GeneratedReportRepository } from './repositories/generated-report.repository';

@Module({
  controllers: [GeneratedReportsController],
  providers: [GeneratedReportsService, GeneratedReportRepository],
  exports: [GeneratedReportsService],
})
export class GeneratedReportsModule {}
