import { PartialType } from '@nestjs/swagger';
import { CreateDefectTemplateDto } from './create-defect-template.dto';

export class UpdateDefectTemplateDto extends PartialType(CreateDefectTemplateDto) {}
