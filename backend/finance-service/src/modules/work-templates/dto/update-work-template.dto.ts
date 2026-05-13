import { PartialType } from '@nestjs/swagger';
import { CreateWorkTemplateDto } from './create-work-template.dto';

export class UpdateWorkTemplateDto extends PartialType(CreateWorkTemplateDto) {}
