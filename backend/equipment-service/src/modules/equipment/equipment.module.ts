import { Module } from '@nestjs/common';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';
import { EquipmentRepository } from './repositories/equipment.repository';

@Module({
  controllers: [EquipmentController],
  providers: [EquipmentService, EquipmentRepository],
  exports: [EquipmentService],
})
export class EquipmentModule {}
