import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePayrollDto {
  @ApiPropertyOptional({ description: 'User ID' })
  @IsOptional()
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ description: 'Payroll period', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  payrollPeriod?: string;

  @ApiPropertyOptional({ description: 'Base salary' })
  @IsOptional()
  @IsNumber()
  baseSalary?: number;

  @ApiPropertyOptional({ description: 'Bonuses amount', default: 0 })
  @IsOptional()
  @IsNumber()
  bonusesAmount?: number;

  @ApiPropertyOptional({ description: 'Deductions amount', default: 0 })
  @IsOptional()
  @IsNumber()
  deductionsAmount?: number;

  @ApiPropertyOptional({ description: 'Total amount' })
  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @ApiPropertyOptional({ description: 'Worked hours' })
  @IsOptional()
  @IsNumber()
  workedHours?: number;

  @ApiPropertyOptional({ description: 'Overtime hours' })
  @IsOptional()
  @IsNumber()
  overtimeHours?: number;

  @ApiPropertyOptional({ description: 'Status', default: 0 })
  @IsOptional()
  @IsNumber()
  status?: number;

  @ApiPropertyOptional({ description: 'Payment date' })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
