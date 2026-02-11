import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  MaxLength,
} from 'class-validator';

export class CreateSafetyTrainingDto {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  trainingName: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trainingType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  durationHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  validityMonths?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  materials?: string[];
}
