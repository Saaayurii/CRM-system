import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  MaxLength,
  IsArray,
} from 'class-validator';

export class CreateTaskDto {
  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  accountId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  projectId?: number;

  @ApiProperty({ example: 'Залить фундамент' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'construction' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  taskType?: string;

  @ApiPropertyOptional({ example: 0, description: '0-new, 1-assigned, 2-in_progress, 3-review, 4-done, 5-cancelled' })
  @IsNumber()
  @IsOptional()
  status?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  assignedToUserId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  parentTaskId?: number;

  @ApiPropertyOptional({
    example: 2,
    description: '1-low, 2-medium, 3-high, 4-critical',
  })
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-01-20' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ example: 8 })
  @IsNumber()
  @IsOptional()
  estimatedHours?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  locationDescription?: string;

  @ApiPropertyOptional({ example: ['urgent', 'foundation'] })
  @IsArray()
  @IsOptional()
  tags?: string[];
}
