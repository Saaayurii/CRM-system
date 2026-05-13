import { PartialType } from '@nestjs/swagger';
import { CreateInventorySessionDto } from './create-inventory.dto';

export class UpdateInventorySessionDto extends PartialType(CreateInventorySessionDto) {}
