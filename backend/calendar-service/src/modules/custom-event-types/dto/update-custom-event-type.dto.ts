import { PartialType } from '@nestjs/swagger';
import { CreateCustomEventTypeDto } from './create-custom-event-type.dto';

export class UpdateCustomEventTypeDto extends PartialType(CreateCustomEventTypeDto) {}
