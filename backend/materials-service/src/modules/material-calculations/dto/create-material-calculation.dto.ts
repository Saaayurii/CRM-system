import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const CALCULATOR_TYPES = [
  'screed',
  'warm_floor',
  'electrics',
  'plaster',
  'tile',
] as const;
export type CalculatorType = (typeof CALCULATOR_TYPES)[number];

export class CreateMaterialCalculationDto {
  @ApiPropertyOptional({ description: 'Account ID (overridden from JWT)' })
  @IsNumber()
  @IsOptional()
  accountId?: number;

  @ApiPropertyOptional({ description: 'Project ID' })
  @IsNumber()
  @IsOptional()
  projectId?: number;

  @ApiPropertyOptional({ description: 'Created by user ID (overridden from JWT)' })
  @IsNumber()
  @IsOptional()
  createdByUserId?: number;

  @ApiProperty({
    description: 'Calculator type',
    enum: CALCULATOR_TYPES,
    example: 'screed',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(CALCULATOR_TYPES as unknown as string[])
  calculatorType: CalculatorType;

  @ApiPropertyOptional({ description: 'Title' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiProperty({ description: 'Input parameters (calculator-specific)' })
  @IsObject()
  inputs: Record<string, unknown>;

  @ApiProperty({ description: 'Computed results (calculator-specific)' })
  @IsObject()
  results: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Validation warnings' })
  @IsOptional()
  warnings?: unknown[];

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Linked purchase task ID' })
  @IsNumber()
  @IsOptional()
  taskId?: number;
}
