import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class UpdateInventoryCheckDto {
  @ApiPropertyOptional({ description: 'Check date' })
  @IsDateString()
  @IsOptional()
  checkDate?: string;

  @ApiPropertyOptional({ description: 'Performed by user ID' })
  @IsNumber()
  @IsOptional()
  performedByUserId?: number;

  @ApiPropertyOptional({ description: 'Status' })
  @IsNumber()
  @IsOptional()
  status?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
