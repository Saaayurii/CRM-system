import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  MaxLength,
  IsObject,
} from 'class-validator';

export class UpdateProjectDto {
  @ApiPropertyOptional({ description: 'Project name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Project code' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  code?: string;

  @ApiPropertyOptional({ description: 'Project description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Project manager user ID' })
  @IsNumber()
  @IsOptional()
  projectManagerId?: number;

  @ApiPropertyOptional({ description: 'Client name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  clientName?: string;

  @ApiPropertyOptional({ description: 'Client contact info' })
  @IsObject()
  @IsOptional()
  clientContact?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Planned end date' })
  @IsDateString()
  @IsOptional()
  plannedEndDate?: string;

  @ApiPropertyOptional({ description: 'Actual end date' })
  @IsDateString()
  @IsOptional()
  actualEndDate?: string;

  @ApiPropertyOptional({ description: 'Budget' })
  @IsNumber()
  @IsOptional()
  budget?: number;

  @ApiPropertyOptional({ description: 'Actual cost' })
  @IsNumber()
  @IsOptional()
  actualCost?: number;

  @ApiPropertyOptional({ description: 'Status (0-draft, 1-active, 2-paused, 3-completed, 4-cancelled)' })
  @IsNumber()
  @IsOptional()
  status?: number;

  @ApiPropertyOptional({ description: 'Priority (1-low, 2-medium, 3-high, 4-critical)' })
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ description: 'Project address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Coordinates' })
  @IsObject()
  @IsOptional()
  coordinates?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Settings' })
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}
