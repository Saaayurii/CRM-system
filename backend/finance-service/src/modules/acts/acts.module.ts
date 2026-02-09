import { Module } from '@nestjs/common';
import { ActsController } from './acts.controller';
import { ActsService } from './acts.service';
import { ActRepository } from './repositories/act.repository';

@Module({
  controllers: [ActsController],
  providers: [ActsService, ActRepository],
  exports: [ActsService],
})
export class ActsModule {}
