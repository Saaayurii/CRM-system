import {
  IsString,
  IsInt,
  IsOptional,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateShareLinkDto {
  @IsString()
  @MaxLength(64)
  entityType!: string;

  @IsInt()
  entityId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  // ISO-строка; null/undefined = бессрочная ссылка
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
