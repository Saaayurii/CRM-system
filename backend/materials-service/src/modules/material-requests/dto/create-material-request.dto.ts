import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateMaterialRequestItemDto } from './create-material-request-item.dto';

export class CreateMaterialRequestDto {
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

  @ApiPropertyOptional({ description: 'Task ID', example: 1 })
  @IsNumber()
  @IsOptional()
  taskId?: number;

  @ApiProperty({ description: 'Request number', example: 'REQ-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  requestNumber: string;

  @ApiPropertyOptional({ description: 'Requested by user ID', example: 1 })
  @IsNumber()
  @IsOptional()
  requestedByUserId?: number;

  @ApiPropertyOptional({ description: 'Status', example: 0 })
  @IsNumber()
  @IsOptional()
  status?: number;

  @ApiPropertyOptional({ description: 'Priority', example: 2 })
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiProperty({ description: 'Request date', example: '2025-01-15' })
  @IsDateString()
  @IsNotEmpty()
  requestDate: string;

  @ApiPropertyOptional({ description: 'Needed by date', example: '2025-02-01' })
  @IsDateString()
  @IsOptional()
  neededByDate?: string;

  @ApiPropertyOptional({ description: 'Purpose' })
  @IsString()
  @IsOptional()
  purpose?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Request items', type: [CreateMaterialRequestItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMaterialRequestItemDto)
  @IsOptional()
  items?: CreateMaterialRequestItemDto[];
}
