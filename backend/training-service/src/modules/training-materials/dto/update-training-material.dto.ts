import { PartialType } from '@nestjs/swagger';
import { CreateTrainingMaterialDto } from './create-training-material.dto';
export class UpdateTrainingMaterialDto extends PartialType(
  CreateTrainingMaterialDto,
) {}
