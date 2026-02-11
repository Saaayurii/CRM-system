import { PartialType } from '@nestjs/swagger';
import { CreateInspectionTemplateDto } from './create-inspection-template.dto';

export class UpdateInspectionTemplateDto extends PartialType(
  CreateInspectionTemplateDto,
) {}
