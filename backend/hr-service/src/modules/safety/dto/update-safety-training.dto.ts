import { PartialType } from '@nestjs/swagger';
import { CreateSafetyTrainingDto } from './create-safety-training.dto';

export class UpdateSafetyTrainingDto extends PartialType(CreateSafetyTrainingDto) {}
