import { PartialType } from '@nestjs/swagger';
import { CreateEquipmentMaintenanceDto } from './create-equipment-maintenance.dto';

export class UpdateEquipmentMaintenanceDto extends PartialType(CreateEquipmentMaintenanceDto) {}
