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

export class CreateDefectDto {
  @ApiPropertyOptional({ description: 'Project ID' })
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

  @ApiPropertyOptional({ description: 'Inspection ID' })
  @IsOptional()
  @IsNumber()
  inspectionId?: number;

  @ApiProperty({ description: 'Unique defect number', maxLength: 100 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  defectNumber: string;

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

  @ApiPropertyOptional({ description: 'Severity level' })
  @IsOptional()
  @IsNumber()
  severity?: number;

  @ApiProperty({ description: 'Defect title', maxLength: 255 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Location description' })
  @IsOptional()
  @IsString()
  locationDescription?: string;

  @ApiPropertyOptional({ description: 'Coordinates (JSON)' })
  @IsOptional()
  coordinates?: any;

  @ApiPropertyOptional({ description: 'Reported by user ID' })
  @IsOptional()
  @IsNumber()
  reportedByUserId?: number;

  @ApiPropertyOptional({ description: 'Assigned to user ID' })
  @IsOptional()
  @IsNumber()
  assignedToUserId?: number;

  @ApiPropertyOptional({ description: 'Verified by user ID' })
  @IsOptional()
  @IsNumber()
  verifiedByUserId?: number;

  @ApiPropertyOptional({ description: 'Status code', default: 0 })
  @IsOptional()
  @IsNumber()
  status?: number;

  @ApiProperty({ description: 'Reported date (ISO 8601)' })
  @IsNotEmpty()
  @IsDateString()
  reportedDate: string;

  @ApiPropertyOptional({ description: 'Due date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Fixed date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  fixedDate?: string;

  @ApiPropertyOptional({ description: 'Verified date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  verifiedDate?: string;

  @ApiPropertyOptional({ description: 'Correction description' })
  @IsOptional()
  @IsString()
  correctionDescription?: string;

  @ApiPropertyOptional({ description: 'Correction cost' })
  @IsOptional()
  @IsNumber()
  correctionCost?: number;

  @ApiPropertyOptional({ description: 'Photos (JSON array)', default: [] })
  @IsOptional()
  @IsArray()
  photos?: any[];

  @ApiPropertyOptional({ description: 'Documents (JSON array)', default: [] })
  @IsOptional()
  @IsArray()
  documents?: any[];
}
