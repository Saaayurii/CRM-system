import { IsString, IsOptional, IsNumber, IsDateString, IsArray, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateActDto {
  @ApiPropertyOptional({ description: 'Project ID' })
  @IsOptional()
  @IsNumber()
  projectId?: number;

  @ApiPropertyOptional({ description: 'Construction site ID' })
  @IsOptional()
  @IsNumber()
  constructionSiteId?: number;

  @ApiPropertyOptional({ description: 'Contractor ID' })
  @IsOptional()
  @IsNumber()
  contractorId?: number;

  @ApiProperty({ description: 'Act number', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  actNumber: string;

  @ApiPropertyOptional({ description: 'Act type', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  actType?: string;

  @ApiProperty({ description: 'Act date' })
  @IsDateString()
  actDate: string;

  @ApiPropertyOptional({ description: 'Subtotal' })
  @IsOptional()
  @IsNumber()
  subtotal?: number;

  @ApiPropertyOptional({ description: 'Tax amount' })
  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @ApiPropertyOptional({ description: 'Total amount' })
  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @ApiPropertyOptional({ description: 'Currency', default: 'RUB', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ description: 'Status (0-4)', default: 0 })
  @IsOptional()
  @IsNumber()
  status?: number;

  @ApiPropertyOptional({ description: 'Approved by user ID' })
  @IsOptional()
  @IsNumber()
  approvedByUserId?: number;

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
}
