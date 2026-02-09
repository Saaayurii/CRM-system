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

export class CreateInspectionDto {
  @ApiProperty({ description: 'Project ID' })
  @IsOptional()
  @IsNumber()
  projectId?: number;

  @ApiPropertyOptional({ description: 'Construction site ID' })
  @IsOptional()
  @IsNumber()
  constructionSiteId?: number;

  @ApiPropertyOptional({ description: 'Task ID' })
  @IsOptional()
  @IsNumber()
  taskId?: number;

  @ApiPropertyOptional({ description: 'Quality standard ID' })
  @IsOptional()
  @IsNumber()
  qualityStandardId?: number;

  @ApiProperty({ description: 'Unique inspection number', maxLength: 100 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  inspectionNumber: string;

  @ApiPropertyOptional({ description: 'Type of inspection', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  inspectionType?: string;

  @ApiPropertyOptional({ description: 'Inspector user ID' })
  @IsOptional()
  @IsNumber()
  inspectorId?: number;

  @ApiPropertyOptional({ description: 'Scheduled date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({ description: 'Actual date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  actualDate?: string;

  @ApiPropertyOptional({ description: 'Status code', default: 0 })
  @IsOptional()
  @IsNumber()
  status?: number;

  @ApiPropertyOptional({ description: 'Inspection result', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  result?: string;

  @ApiPropertyOptional({ description: 'Inspection area', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  inspectionArea?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Findings' })
  @IsOptional()
  @IsString()
  findings?: string;

  @ApiPropertyOptional({ description: 'Recommendations' })
  @IsOptional()
  @IsString()
  recommendations?: string;

  @ApiPropertyOptional({ description: 'Score' })
  @IsOptional()
  @IsNumber()
  score?: number;

  @ApiPropertyOptional({ description: 'Photos (JSON array)', default: [] })
  @IsOptional()
  @IsArray()
  photos?: any[];

  @ApiPropertyOptional({ description: 'Documents (JSON array)', default: [] })
  @IsOptional()
  @IsArray()
  documents?: any[];
}
