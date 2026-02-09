import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSupplierOrderItemDto {
  @ApiPropertyOptional({ description: 'Material ID', example: 1 })
  @IsNumber()
  @IsOptional()
  materialId?: number;

  @ApiProperty({ description: 'Quantity', example: 100 })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiPropertyOptional({ description: 'Unit', example: 'шт' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional({ description: 'Unit price', example: 500 })
  @IsNumber()
  @IsOptional()
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Total price', example: 50000 })
  @IsNumber()
  @IsOptional()
  totalPrice?: number;

  @ApiPropertyOptional({ description: 'Delivered quantity', example: 0 })
  @IsNumber()
  @IsOptional()
  deliveredQuantity?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
