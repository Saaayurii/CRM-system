import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateContractorAssignmentDto {
  @ApiPropertyOptional({ description: 'Project ID', example: 1 })
  @IsNumber()
  @IsOptional()
  projectId?: number;

  @ApiPropertyOptional({ description: 'Construction site ID', example: 1 })
  @IsNumber()
  @IsOptional()
  constructionSiteId?: number;

  @ApiPropertyOptional({ description: 'Work type', example: 'Фундаментные работы' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  workType?: string;

  @ApiPropertyOptional({ description: 'Contract amount', example: 1500000 })
  @IsNumber()
  @IsOptional()
  contractAmount?: number;

  @ApiPropertyOptional({ description: 'Start date', example: '2024-03-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date', example: '2024-06-01' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Status', example: 0 })
  @IsNumber()
  @IsOptional()
  status?: number;
}
