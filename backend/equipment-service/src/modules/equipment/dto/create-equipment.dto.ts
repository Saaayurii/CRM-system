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

export class CreateEquipmentDto {
  @ApiProperty({ description: 'Equipment name', maxLength: 255 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Equipment type', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  equipmentType?: string;

  @ApiPropertyOptional({ description: 'Manufacturer', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  manufacturer?: string;

  @ApiPropertyOptional({ description: 'Model', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  model?: string;

  @ApiPropertyOptional({ description: 'Serial number', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Purchase date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({ description: 'Purchase cost' })
  @IsOptional()
  @IsNumber()
  purchaseCost?: number;

  @ApiPropertyOptional({ description: 'Status code', default: 1 })
  @IsOptional()
  @IsNumber()
  status?: number;

  @ApiPropertyOptional({ description: 'Current location', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  currentLocation?: string;

  @ApiPropertyOptional({ description: 'Construction site ID' })
  @IsOptional()
  @IsNumber()
  constructionSiteId?: number;

  @ApiPropertyOptional({ description: 'Assigned to user ID' })
  @IsOptional()
  @IsNumber()
  assignedToUserId?: number;

  @ApiPropertyOptional({ description: 'Last maintenance date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  lastMaintenanceDate?: string;

  @ApiPropertyOptional({ description: 'Next maintenance date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  nextMaintenanceDate?: string;

  @ApiPropertyOptional({ description: 'Maintenance interval in days' })
  @IsOptional()
  @IsNumber()
  maintenanceIntervalDays?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Photos (JSON array)', default: [] })
  @IsOptional()
  @IsArray()
  photos?: any[];

  @ApiPropertyOptional({ description: 'Documents (JSON array)', default: [] })
  @IsOptional()
  @IsArray()
  documents?: any[];
}
