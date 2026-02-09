import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsObject,
  MaxLength,
} from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty({ description: 'Account ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  accountId: number;

  @ApiPropertyOptional({ description: 'Construction site ID', example: 1 })
  @IsNumber()
  @IsOptional()
  constructionSiteId?: number;

  @ApiProperty({ description: 'Warehouse name', example: 'Основной склад' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Warehouse code', example: 'WH-001' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  code?: string;

  @ApiPropertyOptional({ description: 'Warehouse type', example: 'main' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  warehouseType?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Coordinates JSON' })
  @IsObject()
  @IsOptional()
  coordinates?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Warehouse keeper user ID', example: 1 })
  @IsNumber()
  @IsOptional()
  warehouseKeeperId?: number;

  @ApiPropertyOptional({ description: 'Capacity', example: 10000 })
  @IsNumber()
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({ description: 'Area size in sq meters', example: 500 })
  @IsNumber()
  @IsOptional()
  areaSize?: number;
}
