import { PartialType } from '@nestjs/swagger';
import { CreateSitePlanDto } from './create-site-plan.dto';

export class UpdateSitePlanDto extends PartialType(CreateSitePlanDto) {}
