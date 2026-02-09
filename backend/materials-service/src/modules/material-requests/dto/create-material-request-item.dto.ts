import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateMaterialRequestItemDto {
  @ApiPropertyOptional({ description: 'Material ID', example: 1 })
  @IsNumber()
  @IsOptional()
  materialId?: number;

  @ApiProperty({ description: 'Requested quantity', example: 100 })
  @IsNumber()
  @IsNotEmpty()
  requestedQuantity: number;

  @ApiPropertyOptional({ description: 'Approved quantity', example: 100 })
  @IsNumber()
  @IsOptional()
  approvedQuantity?: number;

  @ApiPropertyOptional({ description: 'Unit', example: 'кг' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
