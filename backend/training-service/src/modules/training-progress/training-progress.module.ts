import { Module } from '@nestjs/common';
import { TrainingProgressController } from './training-progress.controller';
import { TrainingProgressService } from './training-progress.service';
import { TrainingProgressRepository } from './repositories/training-progress.repository';
@Module({
  controllers: [TrainingProgressController],
  providers: [TrainingProgressService, TrainingProgressRepository],
  exports: [TrainingProgressService],
})
export class TrainingProgressModule {}
