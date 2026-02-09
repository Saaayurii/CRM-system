import { PartialType } from '@nestjs/swagger';
import { CreateActDto } from './create-act.dto';

export class UpdateActDto extends PartialType(CreateActDto) {}
