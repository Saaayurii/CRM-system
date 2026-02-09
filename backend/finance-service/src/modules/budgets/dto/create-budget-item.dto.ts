import { IsString, IsOptional, IsNumber, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBudgetItemDto {
  @ApiPropertyOptional({ description: 'Category', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: 'Subcategory', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  subcategory?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Planned amount' })
  @IsNumber()
  plannedAmount: number;

  @ApiPropertyOptional({ description: 'Allocated amount', default: 0 })
  @IsOptional()
  @IsNumber()
  allocatedAmount?: number;

  @ApiPropertyOptional({ description: 'Spent amount', default: 0 })
  @IsOptional()
  @IsNumber()
  spentAmount?: number;
}
