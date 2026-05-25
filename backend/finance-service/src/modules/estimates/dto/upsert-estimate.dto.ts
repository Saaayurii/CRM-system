import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEstimateDto {
  @ApiProperty({ maxLength: 255 })
  @IsString() @MaxLength(255)
  name!: string;

  @ApiProperty()
  @IsInt() @Min(1)
  projectId!: number;

  @ApiPropertyOptional()
  @IsOptional() @IsInt()
  contractId?: number | null;

  @ApiPropertyOptional({ maxLength: 100, description: '«Работа» / «Черновые материалы» / …' })
  @IsOptional() @IsString() @MaxLength(100)
  article?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional() @IsString() @MaxLength(50)
  docNumber?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  docDate?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  periodFrom?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  periodTo?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  markupPercent?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsInt()
  status?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}

export class UpdateEstimateDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional() @IsString() @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsInt()
  projectId?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsInt()
  contractId?: number | null;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  article?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional() @IsString() @MaxLength(50)
  docNumber?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  docDate?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  periodFrom?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  periodTo?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  markupPercent?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsInt()
  status?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}

export class UpsertSectionDto {
  @ApiProperty({ maxLength: 500 })
  @IsString() @MaxLength(500)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsInt() @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsInt()
  status?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  confirmedAt?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  sectionDate?: string;
}

export class UpsertItemDto {
  @ApiProperty({ maxLength: 500 })
  @IsString() @MaxLength(500)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsInt()
  priceItemId?: number | null;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional() @IsString() @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsInt() @Min(0)
  sortOrder?: number;
}
