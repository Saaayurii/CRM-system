import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateMaterialCategoryDto {
  @ApiProperty({ description: 'Account ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  accountId: number;

  @ApiPropertyOptional({ description: 'Parent category ID', example: 1 })
  @IsNumber()
  @IsOptional()
  parentCategoryId?: number;

  @ApiProperty({ description: 'Category name', example: 'Строительные смеси' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Category code', example: 'CAT-001' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  code?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Icon name', example: 'cement' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  icon?: string;

  @ApiPropertyOptional({ description: 'Sort order', example: 0 })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
