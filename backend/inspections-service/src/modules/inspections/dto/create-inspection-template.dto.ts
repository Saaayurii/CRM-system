import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  IsObject,
  MaxLength,
} from 'class-validator';

export class CreateInspectionTemplateDto {
  @ApiProperty({ description: 'Template name', maxLength: 255 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Inspection type', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  inspectionType?: string;

  @ApiPropertyOptional({
    description: 'Checklist items (JSON array)',
    default: [],
  })
  @IsOptional()
  @IsArray()
  checklistItems?: any[];

  @ApiPropertyOptional({ description: 'Is template active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Настройки инспекции (требовать фото, авто-создавать дефекты, вес и т.п.)',
    default: {},
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
