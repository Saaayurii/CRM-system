import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateDefectTemplateDto {
  @ApiPropertyOptional({ description: 'Defect type', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  defectType?: string;

  @ApiPropertyOptional({ description: 'Category', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: 'Title', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Severity level' })
  @IsOptional()
  @IsNumber()
  severity?: number;

  @ApiPropertyOptional({ description: 'Typical correction cost' })
  @IsOptional()
  @IsNumber()
  typicalCost?: number;

  @ApiPropertyOptional({ description: 'Fix instructions' })
  @IsOptional()
  @IsString()
  fixInstructions?: string;

  @ApiPropertyOptional({ description: 'Is template active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
