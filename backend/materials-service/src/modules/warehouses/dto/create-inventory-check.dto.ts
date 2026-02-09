import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInventoryCheckItemDto {
  @ApiPropertyOptional({ description: 'Material ID', example: 1 })
  @IsNumber()
  @IsOptional()
  materialId?: number;

  @ApiPropertyOptional({ description: 'Expected quantity', example: 100 })
  @IsNumber()
  @IsOptional()
  expectedQuantity?: number;

  @ApiPropertyOptional({ description: 'Actual quantity', example: 95 })
  @IsNumber()
  @IsOptional()
  actualQuantity?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateInventoryCheckDto {
  @ApiProperty({ description: 'Warehouse ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  warehouseId: number;

  @ApiProperty({ description: 'Check number', example: 'INV-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  checkNumber: string;

  @ApiProperty({ description: 'Check date', example: '2025-01-15' })
  @IsDateString()
  @IsNotEmpty()
  checkDate: string;

  @ApiPropertyOptional({ description: 'Performed by user ID', example: 1 })
  @IsNumber()
  @IsOptional()
  performedByUserId?: number;

  @ApiPropertyOptional({ description: 'Status', example: 0 })
  @IsNumber()
  @IsOptional()
  status?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Check items', type: [CreateInventoryCheckItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInventoryCheckItemDto)
  @IsOptional()
  items?: CreateInventoryCheckItemDto[];
}
