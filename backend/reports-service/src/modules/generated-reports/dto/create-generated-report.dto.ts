import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGeneratedReportDto {
  @ApiPropertyOptional({ description: 'Report template ID' })
  @IsOptional()
  @IsNumber()
  reportTemplateId?: number;

  @ApiPropertyOptional({ description: 'Report name', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reportName?: string;

  @ApiPropertyOptional({ description: 'Period start date' })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({ description: 'Period end date' })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiPropertyOptional({ description: 'Project ID' })
  @IsOptional()
  @IsNumber()
  projectId?: number;

  @ApiPropertyOptional({ description: 'Construction site ID' })
  @IsOptional()
  @IsNumber()
  constructionSiteId?: number;

  @ApiPropertyOptional({ description: 'Report data' })
  @IsOptional()
  @IsObject()
  reportData?: any;

  @ApiPropertyOptional({ description: 'File URL', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  fileUrl?: string;
}
