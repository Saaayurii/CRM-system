import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollRepository } from './repositories/payroll.repository';

@Module({
  controllers: [PayrollController],
  providers: [PayrollService, PayrollRepository],
  exports: [PayrollService],
})
export class PayrollModule {}
