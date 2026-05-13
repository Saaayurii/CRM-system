import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProposalLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  workTemplateId?: number;

  @ApiProperty()
  @IsString()
  serviceName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceDesc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  totalPrice?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateProposalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  projectId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  proposalNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objectAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objectComment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerName?: string;

  @ApiPropertyOptional({ default: 'draft' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [CreateProposalLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProposalLineDto)
  lines?: CreateProposalLineDto[];
}
