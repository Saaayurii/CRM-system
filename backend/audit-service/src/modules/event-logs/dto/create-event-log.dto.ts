import {
  IsString,
  IsOptional,
  IsInt,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventLogDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  eventType: string;
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  eventCategory?: string;
  @ApiProperty({ maxLength: 100 }) @IsString() @MaxLength(100) action: string;
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityType?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() entityId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() userId?: number;
  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ipAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userAgent?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() changes?: any;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: any;
  @ApiPropertyOptional() @IsOptional() @IsInt() projectId?: number;
}
