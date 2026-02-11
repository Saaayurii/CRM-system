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

export class CreateEquipmentMaintenanceDto {
  @ApiProperty({ description: 'Equipment ID' })
  @IsNotEmpty()
  @IsNumber()
  equipmentId: number;

  @ApiPropertyOptional({ description: 'Maintenance type', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  maintenanceType?: string;

  @ApiProperty({ description: 'Maintenance date (ISO 8601)' })
  @IsNotEmpty()
  @IsDateString()
  maintenanceDate: string;

  @ApiPropertyOptional({ description: 'Performed by user ID' })
  @IsOptional()
  @IsNumber()
  performedByUserId?: number;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Cost' })
  @IsOptional()
  @IsNumber()
  cost?: number;

  @ApiPropertyOptional({ description: 'Next maintenance date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  nextMaintenanceDate?: string;

  @ApiPropertyOptional({ description: 'Documents (JSON array)', default: [] })
  @IsOptional()
  @IsArray()
  documents?: any[];
}
