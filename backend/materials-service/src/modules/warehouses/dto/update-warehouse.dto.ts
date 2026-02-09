import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsObject,
  MaxLength,
} from 'class-validator';

export class UpdateWarehouseDto {
  @ApiPropertyOptional({ description: 'Construction site ID' })
  @IsNumber()
  @IsOptional()
  constructionSiteId?: number;

  @ApiPropertyOptional({ description: 'Warehouse name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Warehouse code' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  code?: string;

  @ApiPropertyOptional({ description: 'Warehouse type' })
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

  @ApiPropertyOptional({ description: 'Warehouse keeper user ID' })
  @IsNumber()
  @IsOptional()
  warehouseKeeperId?: number;

  @ApiPropertyOptional({ description: 'Capacity' })
  @IsNumber()
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({ description: 'Area size in sq meters' })
  @IsNumber()
  @IsOptional()
  areaSize?: number;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
