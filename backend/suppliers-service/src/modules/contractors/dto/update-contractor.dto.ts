import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  MaxLength,
} from 'class-validator';

export class UpdateContractorDto {
  @ApiPropertyOptional({
    description: 'Contractor name',
    example: 'ООО СтройПодряд',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Legal name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  legalName?: string;

  @ApiPropertyOptional({ description: 'INN' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  inn?: string;

  @ApiPropertyOptional({ description: 'KPP' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  kpp?: string;

  @ApiPropertyOptional({ description: 'Contact person' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactPerson?: string;

  @ApiPropertyOptional({ description: 'Phone' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Email' })
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

  @ApiPropertyOptional({ description: 'Rating (0-5)' })
  @IsNumber()
  @IsOptional()
  rating?: number;

  @ApiPropertyOptional({ description: 'Reliability score' })
  @IsNumber()
  @IsOptional()
  reliabilityScore?: number;

  @ApiPropertyOptional({ description: 'Payment terms' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  paymentTerms?: string;

  @ApiPropertyOptional({ description: 'Status (0-inactive, 1-active)' })
  @IsNumber()
  @IsOptional()
  status?: number;

  @ApiPropertyOptional({ description: 'Is verified' })
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
