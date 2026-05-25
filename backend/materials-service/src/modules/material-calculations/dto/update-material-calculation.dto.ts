import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMaterialCalculationDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  projectId?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  inputs?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  results?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  warnings?: unknown[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  taskId?: number;
}
