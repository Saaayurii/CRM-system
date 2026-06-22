import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  MaxLength,
} from 'class-validator';

export class CreateSitePlanDto {
  @ApiPropertyOptional({ description: 'Project ID' })
  @IsOptional()
  @IsNumber()
  projectId?: number;

  @ApiPropertyOptional({ description: 'Construction site ID' })
  @IsOptional()
  @IsNumber()
  constructionSiteId?: number;

  @ApiProperty({ description: 'Plan title', maxLength: 255 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Image URL (uploaded via /inspections/upload)' })
  @IsNotEmpty()
  @IsString()
  imageUrl: string;

  @ApiPropertyOptional({ description: 'Image natural width (px)' })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ description: 'Image natural height (px)' })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
