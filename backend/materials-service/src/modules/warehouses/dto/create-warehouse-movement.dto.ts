import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsObject,
  IsArray,
  MaxLength,
} from 'class-validator';

export class CreateWarehouseMovementDto {
  @ApiProperty({ description: 'Account ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  accountId: number;

  @ApiPropertyOptional({ description: 'Warehouse ID', example: 1 })
  @IsNumber()
  @IsOptional()
  warehouseId?: number;

  @ApiPropertyOptional({ description: 'Material ID', example: 1 })
  @IsNumber()
  @IsOptional()
  materialId?: number;

  @ApiPropertyOptional({ description: 'Movement type', example: 'incoming' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  movementType?: string;

  @ApiProperty({ description: 'Quantity', example: 100 })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiPropertyOptional({ description: 'Unit', example: 'кг' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional({ description: 'From warehouse ID' })
  @IsNumber()
  @IsOptional()
  fromWarehouseId?: number;

  @ApiPropertyOptional({ description: 'To warehouse ID' })
  @IsNumber()
  @IsOptional()
  toWarehouseId?: number;

  @ApiPropertyOptional({ description: 'Supplier order ID' })
  @IsNumber()
  @IsOptional()
  supplierOrderId?: number;

  @ApiPropertyOptional({ description: 'Material request ID' })
  @IsNumber()
  @IsOptional()
  materialRequestId?: number;

  @ApiPropertyOptional({ description: 'Task ID' })
  @IsNumber()
  @IsOptional()
  taskId?: number;

  @ApiPropertyOptional({ description: 'Performed by user ID' })
  @IsNumber()
  @IsOptional()
  performedByUserId?: number;

  @ApiPropertyOptional({ description: 'Received by user ID' })
  @IsNumber()
  @IsOptional()
  receivedByUserId?: number;

  @ApiPropertyOptional({ description: 'Batch number' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  batchNumber?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Documents JSON array' })
  @IsArray()
  @IsOptional()
  documents?: any[];
}
