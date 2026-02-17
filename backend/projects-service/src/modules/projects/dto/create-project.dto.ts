import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  MaxLength,
  IsObject,
} from 'class-validator';

export class CreateProjectDto {
  @ApiPropertyOptional({ description: 'Account ID', example: 1 })
  @IsNumber()
  @IsOptional()
  accountId?: number;

  @ApiProperty({ description: 'Project name', example: 'ЖК Солнечный' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Project code', example: 'PRJ-001' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  code?: string;

  @ApiPropertyOptional({ description: 'Project description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Project manager user ID', example: 1 })
  @IsNumber()
  @IsOptional()
  projectManagerId?: number;

  @ApiPropertyOptional({
    description: 'Client name',
    example: 'ООО Застройщик',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  clientName?: string;

  @ApiPropertyOptional({ description: 'Client contact info' })
  @IsObject()
  @IsOptional()
  clientContact?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Start date', example: '2024-01-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Planned end date',
    example: '2024-12-31',
  })
  @IsDateString()
  @IsOptional()
  plannedEndDate?: string;

  @ApiPropertyOptional({ description: 'Status (0-planning, 1-active, 2-paused, 3-completed, 4-cancelled)', example: 0 })
  @IsNumber()
  @IsOptional()
  status?: number;

  @ApiPropertyOptional({ description: 'Budget', example: 10000000 })
  @IsNumber()
  @IsOptional()
  budget?: number;

  @ApiPropertyOptional({
    description: 'Priority (1-low, 2-medium, 3-high, 4-critical)',
    example: 2,
  })
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ description: 'Project address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Coordinates {lat, lng}' })
  @IsObject()
  @IsOptional()
  coordinates?: Record<string, any>;
}
