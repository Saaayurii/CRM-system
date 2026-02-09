import { Module } from '@nestjs/common';
import { ContractorsController } from './contractors.controller';
import { ContractorsService } from './contractors.service';
import { ContractorRepository } from './repositories/contractor.repository';

@Module({
  controllers: [ContractorsController],
  providers: [ContractorsService, ContractorRepository],
  exports: [ContractorsService],
})
export class ContractorsModule {}
