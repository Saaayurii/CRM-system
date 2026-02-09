import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  MaxLength,
} from 'class-validator';

export class CreateContractorDto {
  @ApiProperty({ description: 'Account ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  accountId: number;

  @ApiProperty({ description: 'Contractor name', example: 'ООО СтройПодряд' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Legal name', example: 'ООО "СтройПодряд"' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  legalName?: string;

  @ApiPropertyOptional({ description: 'INN', example: '7701234567' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  inn?: string;

  @ApiPropertyOptional({ description: 'KPP', example: '770101001' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  kpp?: string;

  @ApiPropertyOptional({ description: 'Contact person', example: 'Петров Петр Петрович' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactPerson?: string;

  @ApiPropertyOptional({ description: 'Phone', example: '+7 (495) 987-65-43' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Email', example: 'info@stroypodryad.ru' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Legal address' })
  @IsString()
  @IsOptional()
  legalAddress?: string;

  @ApiPropertyOptional({ description: 'Specialization', type: [Object] })
  @IsArray()
  @IsOptional()
  specialization?: any[];

  @ApiPropertyOptional({ description: 'Rating (0-5)', example: 4.5 })
  @IsNumber()
  @IsOptional()
  rating?: number;

  @ApiPropertyOptional({ description: 'Reliability score', example: 85 })
  @IsNumber()
  @IsOptional()
  reliabilityScore?: number;

  @ApiPropertyOptional({ description: 'Payment terms', example: '30 days' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  paymentTerms?: string;

  @ApiPropertyOptional({ description: 'Status (0-inactive, 1-active)', example: 1 })
  @IsNumber()
  @IsOptional()
  status?: number;

  @ApiPropertyOptional({ description: 'Is verified', example: false })
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Documents', type: [Object] })
  @IsArray()
  @IsOptional()
  documents?: any[];
}
