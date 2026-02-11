import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateSupplierMaterialDto {
  @ApiPropertyOptional({ description: 'Material ID', example: 1 })
  @IsNumber()
  @IsOptional()
  materialId?: number;

  @ApiPropertyOptional({
    description: 'Supplier code for this material',
    example: 'MAT-001',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  supplierCode?: string;

  @ApiPropertyOptional({ description: 'Price', example: 1500.5 })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ description: 'Currency', example: 'RUB' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ description: 'Minimum order quantity', example: 100 })
  @IsNumber()
  @IsOptional()
  minOrderQuantity?: number;

  @ApiPropertyOptional({ description: 'Delivery time in days', example: 5 })
  @IsNumber()
  @IsOptional()
  deliveryTimeDays?: number;

  @ApiPropertyOptional({ description: 'Is available', example: true })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}
