import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateUserAssignmentDto {
  @ApiProperty({ description: 'User ID' })
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @ApiProperty({ description: 'Project ID' })
  @IsNotEmpty()
  @IsNumber()
  projectId: number;

  @ApiPropertyOptional({ description: 'Construction site ID' })
  @IsOptional()
  @IsNumber()
  constructionSiteId?: number;

  @ApiPropertyOptional({ description: 'Team ID' })
  @IsOptional()
  @IsNumber()
  teamId?: number;

  @ApiPropertyOptional({ description: 'Role on the project', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  roleOnProject?: string;

  @ApiPropertyOptional({ description: 'Assignment date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  assignedAt?: string;

  @ApiPropertyOptional({ description: 'Removal date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  removedAt?: string;

  @ApiPropertyOptional({ description: 'Hourly rate' })
  @IsOptional()
  @IsNumber()
  hourlyRate?: number;

  @ApiPropertyOptional({ description: 'Daily rate' })
  @IsOptional()
  @IsNumber()
  dailyRate?: number;

  @ApiPropertyOptional({
    description: 'Whether the assignment is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
