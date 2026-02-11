import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsObject,
  IsArray,
  MaxLength,
} from 'class-validator';

export class CreateMaterialDto {
  @ApiProperty({ description: 'Account ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  accountId: number;

  @ApiPropertyOptional({ description: 'Category ID', example: 1 })
  @IsNumber()
  @IsOptional()
  categoryId?: number;

  @ApiProperty({ description: 'Material name', example: 'Цемент М500' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Material code', example: 'MAT-001' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  code?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Unit of measurement', example: 'кг' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional({ description: 'Manufacturer', example: 'Евроцемент' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  manufacturer?: string;

  @ApiPropertyOptional({ description: 'Specifications JSON' })
  @IsObject()
  @IsOptional()
  specifications?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Base price', example: 450.0 })
  @IsNumber()
  @IsOptional()
  basePrice?: number;

  @ApiPropertyOptional({ description: 'Currency', example: 'RUB' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ description: 'Minimum stock level', example: 100 })
  @IsNumber()
  @IsOptional()
  minStockLevel?: number;

  @ApiPropertyOptional({ description: 'Maximum stock level', example: 10000 })
  @IsNumber()
  @IsOptional()
  maxStockLevel?: number;

  @ApiPropertyOptional({ description: 'Reorder point', example: 500 })
  @IsNumber()
  @IsOptional()
  reorderPoint?: number;

  @ApiPropertyOptional({ description: 'Photos JSON array' })
  @IsArray()
  @IsOptional()
  photos?: any[];

  @ApiPropertyOptional({ description: 'Documents JSON array' })
  @IsArray()
  @IsOptional()
  documents?: any[];

  @ApiPropertyOptional({ description: 'Barcode', example: '4600000000001' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  barcode?: string;

  @ApiPropertyOptional({ description: 'QR code' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  qrCode?: string;
}
