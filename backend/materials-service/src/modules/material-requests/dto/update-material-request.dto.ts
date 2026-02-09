import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class UpdateMaterialRequestDto {
  @ApiPropertyOptional({ description: 'Project ID' })
  @IsNumber()
  @IsOptional()
  projectId?: number;

  @ApiPropertyOptional({ description: 'Construction site ID' })
  @IsNumber()
  @IsOptional()
  constructionSiteId?: number;

  @ApiPropertyOptional({ description: 'Task ID' })
  @IsNumber()
  @IsOptional()
  taskId?: number;

  @ApiPropertyOptional({ description: 'Approved by user ID' })
  @IsNumber()
  @IsOptional()
  approvedByUserId?: number;

  @ApiPropertyOptional({ description: 'Status' })
  @IsNumber()
  @IsOptional()
  status?: number;

  @ApiPropertyOptional({ description: 'Priority' })
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ description: 'Needed by date' })
  @IsDateString()
  @IsOptional()
  neededByDate?: string;

  @ApiPropertyOptional({ description: 'Approved date' })
  @IsDateString()
  @IsOptional()
  approvedDate?: string;

  @ApiPropertyOptional({ description: 'Purpose' })
  @IsString()
  @IsOptional()
  purpose?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
