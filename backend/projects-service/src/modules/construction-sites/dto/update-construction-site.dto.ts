import { PartialType } from '@nestjs/swagger';
import { CreateConstructionSiteDto } from './create-construction-site.dto';

export class UpdateConstructionSiteDto extends PartialType(
  CreateConstructionSiteDto,
) {}
