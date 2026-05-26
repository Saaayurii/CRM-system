import { Module } from '@nestjs/common';
import { SafetyBriefingsController } from './safety-briefings.controller';
import { SafetyBriefingsService } from './safety-briefings.service';
import { SafetyBriefingsRepository } from './repositories/safety-briefings.repository';

@Module({
  controllers: [SafetyBriefingsController],
  providers: [SafetyBriefingsService, SafetyBriefingsRepository],
  exports: [SafetyBriefingsService],
})
export class SafetyBriefingsModule {}
