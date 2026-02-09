import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateSupplierOrderDto {
  @ApiProperty({ description: 'Account ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  accountId: number;

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

  @ApiProperty({ description: 'Order number (unique)', example: 'ORD-2024-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  orderNumber: string;

  @ApiProperty({ description: 'Order date', example: '2024-01-15' })
  @IsDateString()
  @IsNotEmpty()
  orderDate: string;

  @ApiPropertyOptional({ description: 'Created by user ID', example: 1 })
  @IsNumber()
  @IsOptional()
  createdByUserId?: number;

  @ApiPropertyOptional({ description: 'Approved by user ID', example: 2 })
  @IsNumber()
  @IsOptional()
  approvedByUserId?: number;

  @ApiPropertyOptional({ description: 'Status (0-5)', example: 0 })
  @IsNumber()
  @IsOptional()
  status?: number;

  @ApiPropertyOptional({ description: 'Expected delivery date', example: '2024-02-15' })
  @IsDateString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional({ description: 'Actual delivery date', example: '2024-02-14' })
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

  @ApiPropertyOptional({ description: 'Delivery contact', example: 'Иванов И.И.' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  deliveryContact?: string;

  @ApiPropertyOptional({ description: 'Delivery notes' })
  @IsString()
  @IsOptional()
  deliveryNotes?: string;

  @ApiPropertyOptional({ description: 'Payment terms', example: '30 days' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  paymentTerms?: string;

  @ApiPropertyOptional({ description: 'Payment status', example: 0 })
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
