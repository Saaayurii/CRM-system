import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  MaxLength,
  IsArray,
} from 'class-validator';

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  projectId?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  taskType?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  assignedToUserId?: number;

  @ApiPropertyOptional({ description: '1-low, 2-medium, 3-high, 4-critical' })
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({
    description: '0-new, 1-in_progress, 2-review, 3-completed, 4-cancelled',
  })
  @IsNumber()
  @IsOptional()
  status?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  estimatedHours?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  actualHours?: number;

  @ApiPropertyOptional({ description: '0-100' })
  @IsNumber()
  @IsOptional()
  progressPercentage?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  completionNotes?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  locationDescription?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  tags?: string[];
}
