import { Module } from '@nestjs/common';
import { EquipmentMaintenanceController } from './equipment-maintenance.controller';
import { EquipmentMaintenanceService } from './equipment-maintenance.service';
import { EquipmentMaintenanceRepository } from './repositories/equipment-maintenance.repository';
import { NotificationsClientModule } from '../../common/notifications/notifications-client.module';

@Module({
  imports: [NotificationsClientModule],
  controllers: [EquipmentMaintenanceController],
  providers: [EquipmentMaintenanceService, EquipmentMaintenanceRepository],
  exports: [EquipmentMaintenanceService],
})
export class EquipmentMaintenanceModule {}
