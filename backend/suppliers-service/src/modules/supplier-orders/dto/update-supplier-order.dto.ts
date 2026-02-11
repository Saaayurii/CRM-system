import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class UpdateSupplierOrderDto {
  @ApiPropertyOptional({ description: 'Project ID', example: 1 })
  @IsNumber()
  @IsOptional()
  projectId?: number;

  @ApiPropertyOptional({ description: 'Construction site ID', example: 1 })
  @IsNumber()
  @IsOptional()
  constructionSiteId?: number;

  @ApiPropertyOptional({ description: 'Supplier ID', example: 1 })
  @IsNumber()
  @IsOptional()
  supplierId?: number;

  @ApiPropertyOptional({
    description: 'Order number (unique)',
    example: 'ORD-2024-001',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  orderNumber?: string;

  @ApiPropertyOptional({ description: 'Order date', example: '2024-01-15' })
  @IsDateString()
  @IsOptional()
  orderDate?: string;

  @ApiPropertyOptional({ description: 'Approved by user ID', example: 2 })
  @IsNumber()
  @IsOptional()
  approvedByUserId?: number;

  @ApiPropertyOptional({ description: 'Status (0-5)', example: 1 })
  @IsNumber()
  @IsOptional()
  status?: number;

  @ApiPropertyOptional({
    description: 'Expected delivery date',
    example: '2024-02-15',
  })
  @IsDateString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional({
    description: 'Actual delivery date',
    example: '2024-02-14',
  })
  @IsDateString()
  @IsOptional()
  actualDeliveryDate?: string;

  @ApiPropertyOptional({ description: 'Subtotal', example: 50000 })
  @IsNumber()
  @IsOptional()
  subtotal?: number;

  @ApiPropertyOptional({ description: 'Tax amount', example: 10000 })
  @IsNumber()
  @IsOptional()
  taxAmount?: number;

  @ApiPropertyOptional({ description: 'Delivery cost', example: 5000 })
  @IsNumber()
  @IsOptional()
  deliveryCost?: number;

  @ApiPropertyOptional({ description: 'Total amount', example: 65000 })
  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  @ApiPropertyOptional({ description: 'Currency', example: 'RUB' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ description: 'Delivery address' })
  @IsString()
  @IsOptional()
  deliveryAddress?: string;

  @ApiPropertyOptional({ description: 'Delivery contact' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  deliveryContact?: string;

  @ApiPropertyOptional({ description: 'Delivery notes' })
  @IsString()
  @IsOptional()
  deliveryNotes?: string;

  @ApiPropertyOptional({ description: 'Payment terms' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  paymentTerms?: string;

  @ApiPropertyOptional({ description: 'Payment status' })
  @IsNumber()
  @IsOptional()
  paymentStatus?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Documents', type: [Object] })
  @IsArray()
  @IsOptional()
  documents?: any[];
}
