import { PartialType } from '@nestjs/swagger';
import { CreateSafetyIncidentDto } from './create-safety-incident.dto';

export class UpdateSafetyIncidentDto extends PartialType(CreateSafetyIncidentDto) {}
