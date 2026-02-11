import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsArray,
  MaxLength,
} from 'class-validator';

export class CreateConstructionSiteDto {
  @ApiProperty({ description: 'Project ID' })
  @IsNotEmpty()
  @IsNumber()
  projectId: number;

  @ApiProperty({ description: 'Construction site name', maxLength: 255 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Site code', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string;

  @ApiPropertyOptional({ description: 'Type of site', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  siteType?: string;

  @ApiProperty({ description: 'Site address' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiPropertyOptional({ description: 'Coordinates (JSON)' })
  @IsOptional()
  coordinates?: any;

  @ApiPropertyOptional({ description: 'Area size in square units' })
  @IsOptional()
  @IsNumber()
  areaSize?: number;

  @ApiPropertyOptional({ description: 'Foreman user ID' })
  @IsOptional()
  @IsNumber()
  foremanId?: number;

  @ApiPropertyOptional({ description: 'Status code', default: 0 })
  @IsOptional()
  @IsNumber()
  status?: number;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Planned end date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  plannedEndDate?: string;

  @ApiPropertyOptional({ description: 'Actual end date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  actualEndDate?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Photos (JSON array)', default: [] })
  @IsOptional()
  @IsArray()
  photos?: any[];

  @ApiPropertyOptional({ description: 'Documents (JSON array)', default: [] })
  @IsOptional()
  @IsArray()
  documents?: any[];

  @ApiPropertyOptional({ description: 'Settings (JSON object)', default: {} })
  @IsOptional()
  settings?: any;
}
