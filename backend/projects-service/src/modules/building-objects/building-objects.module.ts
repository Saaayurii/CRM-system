import { Module } from '@nestjs/common';
import { BuildingObjectsController } from './building-objects.controller';
import { BuildingObjectsService } from './building-objects.service';
import { BuildingObjectRepository } from './repositories/building-object.repository';

@Module({
  controllers: [BuildingObjectsController],
  providers: [BuildingObjectsService, BuildingObjectRepository],
  exports: [BuildingObjectsService],
})
export class BuildingObjectsModule {}
