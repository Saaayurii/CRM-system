import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiPropertyOptional({ description: 'Payment account ID' })
  @IsOptional()
  @IsNumber()
  paymentAccountId?: number;

  @ApiPropertyOptional({ description: 'Project ID' })
  @IsOptional()
  @IsNumber()
  projectId?: number;

  @ApiProperty({ description: 'Payment number', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  paymentNumber: string;

  @ApiPropertyOptional({ description: 'Payment type', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentType?: string;

  @ApiPropertyOptional({ description: 'Category', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: 'Counterparty type', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  counterpartyType?: string;

  @ApiPropertyOptional({ description: 'Supplier ID' })
  @IsOptional()
  @IsNumber()
  supplierId?: number;

  @ApiPropertyOptional({ description: 'Contractor ID' })
  @IsOptional()
  @IsNumber()
  contractorId?: number;

  @ApiPropertyOptional({ description: 'User ID' })
  @IsOptional()
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ description: 'Supplier order ID' })
  @IsOptional()
  @IsNumber()
  supplierOrderId?: number;

  @ApiPropertyOptional({ description: 'Act ID' })
  @IsOptional()
  @IsNumber()
  actId?: number;

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({
    description: 'Currency',
    default: 'RUB',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiProperty({ description: 'Payment date' })
  @IsDateString()
  paymentDate: string;

  @ApiPropertyOptional({ description: 'Payment method', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Status', default: 0 })
  @IsOptional()
  @IsNumber()
  status?: number;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Documents', type: [Object] })
  @IsOptional()
  @IsArray()
  documents?: any[];

  @ApiPropertyOptional({ description: 'Approved by user ID' })
  @IsOptional()
  @IsNumber()
  approvedByUserId?: number;
}
