import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  IsNumber,
  MaxLength,
} from 'class-validator';

export class CreateAttendanceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  userId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  projectId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  constructionSiteId?: number;

  @ApiProperty()
  @IsDateString()
  attendanceDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  checkInTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  checkOutTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  workedHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  overtimeHours?: number;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;
}
