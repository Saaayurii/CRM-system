import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomEventTypeDto {
  @ApiProperty({ description: 'Уникальный код типа (внутренний)' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(60)
  code: string;

  @ApiProperty({ description: 'Название (отображается в UI)' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ description: 'Цвет в HEX, напр. #3b82f6' })
  @IsOptional()
  @IsString()
  @MaxLength(9)
  colorHex?: string;

  @ApiPropertyOptional({ description: 'Иконка (lucide name)' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  icon?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  accountId?: number;
}
