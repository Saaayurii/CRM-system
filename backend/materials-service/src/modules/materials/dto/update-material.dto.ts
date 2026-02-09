import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsObject,
  IsArray,
  MaxLength,
} from 'class-validator';

export class UpdateMaterialDto {
  @ApiPropertyOptional({ description: 'Category ID' })
  @IsNumber()
  @IsOptional()
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Material name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Material code' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  code?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Unit of measurement' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional({ description: 'Manufacturer' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  manufacturer?: string;

  @ApiPropertyOptional({ description: 'Specifications JSON' })
  @IsObject()
  @IsOptional()
  specifications?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Base price' })
  @IsNumber()
  @IsOptional()
  basePrice?: number;

  @ApiPropertyOptional({ description: 'Currency' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ description: 'Minimum stock level' })
  @IsNumber()
  @IsOptional()
  minStockLevel?: number;

  @ApiPropertyOptional({ description: 'Maximum stock level' })
  @IsNumber()
  @IsOptional()
  maxStockLevel?: number;

  @ApiPropertyOptional({ description: 'Reorder point' })
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

  @ApiPropertyOptional({ description: 'Barcode' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  barcode?: string;

  @ApiPropertyOptional({ description: 'QR code' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  qrCode?: string;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
