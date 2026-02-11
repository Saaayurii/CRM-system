import { IsString, IsOptional, IsNumber, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBonusDto {
  @ApiPropertyOptional({ description: 'User ID' })
  @IsOptional()
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ description: 'Project ID' })
  @IsOptional()
  @IsNumber()
  projectId?: number;

  @ApiPropertyOptional({ description: 'Bonus type', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bonusType?: string;

  @ApiProperty({ description: 'Bonus amount' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'Currency', default: 'RUB', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ description: 'Period start date' })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({ description: 'Period end date' })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Status', default: 0 })
  @IsOptional()
  @IsNumber()
  status?: number;
}
