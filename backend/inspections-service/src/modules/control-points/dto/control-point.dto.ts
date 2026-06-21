import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateControlPointDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: 'draft | active | archived' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subsection?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  criticality?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  normativeDoc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  normativeSection?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instruction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  scheme?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'array' })
  @IsOptional()
  typicalDefects?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  textTemplates?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  reportSettings?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  publication?: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'array' })
  @IsOptional()
  versions?: any[];
}

export class UpdateControlPointDto extends PartialType(CreateControlPointDto) {}
