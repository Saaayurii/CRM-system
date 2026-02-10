import { Module } from '@nestjs/common';
import { SafetyController } from './safety.controller';
import { SafetyService } from './safety.service';
import { SafetyRepository } from './repositories/safety.repository';

@Module({
  controllers: [SafetyController],
  providers: [SafetyService, SafetyRepository],
  exports: [SafetyService],
})
export class SafetyModule {}
