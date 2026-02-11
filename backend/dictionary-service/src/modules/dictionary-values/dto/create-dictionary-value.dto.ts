import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, MaxLength, IsObject } from 'class-validator';

export class CreateDictionaryValueDto {
  @ApiProperty({ description: 'Dictionary type ID' })
  @IsInt()
  @IsNotEmpty()
  dictionaryTypeId: number;

  @ApiProperty({ description: 'Name of the dictionary value', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Code of the dictionary value', maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  code?: string;

  @ApiPropertyOptional({ description: 'Description of the dictionary value' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Parent value ID for hierarchical dictionaries' })
  @IsInt()
  @IsOptional()
  parentValueId?: number;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Whether the value is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata', default: {} })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
