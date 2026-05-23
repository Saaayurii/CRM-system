import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  IsIn,
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

  @ApiPropertyOptional({ description: 'Construction site ID' })
  @IsOptional()
  @IsNumber()
  constructionSiteId?: number;

  @ApiPropertyOptional({
    description: 'Payment number (auto-generated if missing)',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentNumber?: string;

  @ApiPropertyOptional({ description: 'Payment type (legacy)', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentType?: string;

  @ApiPropertyOptional({ description: 'Direction', enum: ['income', 'expense'] })
  @IsOptional()
  @IsIn(['income', 'expense'])
  direction?: 'income' | 'expense';

  @ApiPropertyOptional({
    description:
      'Sub-type. income: advance|payment|refund; expense: bill|material|advance_disbursement|payroll',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  subType?: string;

  @ApiPropertyOptional({ description: 'Document type code (П, А, В, С, М, Д, Р)' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  documentType?: string;

  @ApiPropertyOptional({ description: 'Cash location', enum: ['hand', 'company'] })
  @IsOptional()
  @IsIn(['hand', 'company'])
  cashLocation?: 'hand' | 'company';

  @ApiPropertyOptional({ description: 'Bank name (for cashLocation=company)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bankName?: string;

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

  @ApiPropertyOptional({ description: 'Payment date (defaults to today)' })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({ description: 'Payment datetime (defaults to now)' })
  @IsOptional()
  @IsDateString()
  paymentDatetime?: string;

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
