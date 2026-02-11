import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class CreateTaskTimeLogDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  taskId: number;

  @ApiProperty({ example: '2024-01-15T09:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiPropertyOptional({ example: '2024-01-15T17:00:00Z' })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ example: 480 })
  @IsNumber()
  @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  userId?: number;

  @ApiPropertyOptional({ example: 'Worked on foundation layout' })
  @IsString()
  @IsOptional()
  description?: string;
}
