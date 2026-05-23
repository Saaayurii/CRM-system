import { Module } from '@nestjs/common';
import { EgrulLookupController } from './egrul-lookup.controller';
import { EgrulLookupService } from './egrul-lookup.service';

@Module({
  controllers: [EgrulLookupController],
  providers: [EgrulLookupService],
})
export class EgrulLookupModule {}
