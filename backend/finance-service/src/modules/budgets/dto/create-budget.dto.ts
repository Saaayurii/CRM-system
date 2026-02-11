import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBudgetDto {
  @ApiPropertyOptional({ description: 'Project ID' })
  @IsOptional()
  @IsNumber()
  projectId?: number;

  @ApiPropertyOptional({ description: 'Construction site ID' })
  @IsOptional()
  @IsNumber()
  constructionSiteId?: number;

  @ApiProperty({ description: 'Budget name', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  budgetName: string;

  @ApiPropertyOptional({ description: 'Budget period', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  budgetPeriod?: string;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Total budget amount' })
  @IsNumber()
  totalBudget: number;

  @ApiPropertyOptional({ description: 'Allocated amount', default: 0 })
  @IsOptional()
  @IsNumber()
  allocatedAmount?: number;

  @ApiPropertyOptional({ description: 'Spent amount', default: 0 })
  @IsOptional()
  @IsNumber()
  spentAmount?: number;

  @ApiPropertyOptional({ description: 'Status (0-2)', default: 1 })
  @IsOptional()
  @IsNumber()
  status?: number;

  @ApiPropertyOptional({ description: 'Approved by user ID' })
  @IsOptional()
  @IsNumber()
  approvedByUserId?: number;
}
