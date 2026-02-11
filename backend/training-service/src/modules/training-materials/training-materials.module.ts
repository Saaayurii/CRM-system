import { Module } from '@nestjs/common';
import { TrainingMaterialsController } from './training-materials.controller';
import { TrainingMaterialsService } from './training-materials.service';
import { TrainingMaterialRepository } from './repositories/training-material.repository';
@Module({
  controllers: [TrainingMaterialsController],
  providers: [TrainingMaterialsService, TrainingMaterialRepository],
  exports: [TrainingMaterialsService],
})
export class TrainingMaterialsModule {}
