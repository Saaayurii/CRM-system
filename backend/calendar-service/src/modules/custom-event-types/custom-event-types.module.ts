import { Module } from '@nestjs/common';
import { CustomEventTypesController } from './custom-event-types.controller';
import { CustomEventTypesService } from './custom-event-types.service';

@Module({
  controllers: [CustomEventTypesController],
  providers: [CustomEventTypesService],
  exports: [CustomEventTypesService],
})
export class CustomEventTypesModule {}
