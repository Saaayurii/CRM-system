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
import { Type } from 'class-transformer';

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
  // Without an explicit element type, the global ValidationPipe's
  // enableImplicitConversion mangles nested plain objects in this array down
  // to `[]` (class-transformer tries to implicitly coerce each element and,
  // finding no primitive/class target, drops its contents). @Type(() =>
  // Object) gives it an explicit non-primitive target so the raw
  // section/point objects pass through untouched.
  @Type(() => Object)
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
