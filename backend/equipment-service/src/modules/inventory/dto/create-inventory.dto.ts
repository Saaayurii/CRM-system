import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInventoryItemDto {
  @ApiProperty({ description: 'Equipment ID' })
  @IsNumber()
  equipmentId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  warehouseId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  expectedStatus?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  actualStatus?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isFound?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateInventorySessionDto {
  @ApiProperty({ description: 'Session name', maxLength: 255 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  projectId?: number;

  @ApiPropertyOptional({ description: 'Status: 0=draft, 1=in_progress, 2=completed', default: 0 })
  @IsOptional()
  @IsNumber()
  status?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  completedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [CreateInventoryItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInventoryItemDto)
  items?: CreateInventoryItemDto[];
}
