import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FinancialReportsController } from './financial-reports.controller';
import { FinancialReportsService } from './financial-reports.service';

@Module({
  imports: [HttpModule.register({ timeout: 15000 })],
  controllers: [FinancialReportsController],
  providers: [FinancialReportsService],
})
export class FinancialReportsModule {}
