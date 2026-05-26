import { PartialType } from '@nestjs/swagger';
import { CreateSafetyBriefingDto } from './create-safety-briefing.dto';

export class UpdateSafetyBriefingDto extends PartialType(
  CreateSafetyBriefingDto,
) {}
