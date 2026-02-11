import { Module } from '@nestjs/common';
import { EquipmentMaintenanceController } from './equipment-maintenance.controller';
import { EquipmentMaintenanceService } from './equipment-maintenance.service';
import { EquipmentMaintenanceRepository } from './repositories/equipment-maintenance.repository';

@Module({
  controllers: [EquipmentMaintenanceController],
  providers: [EquipmentMaintenanceService, EquipmentMaintenanceRepository],
  exports: [EquipmentMaintenanceService],
})
export class EquipmentMaintenanceModule {}
