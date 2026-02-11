import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateDictionaryValueDto } from './create-dictionary-value.dto';

export class UpdateDictionaryValueDto extends PartialType(
  OmitType(CreateDictionaryValueDto, ['dictionaryTypeId'] as const),
) {}
