import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateKnowledgeTestDto {
  @ApiProperty({ maxLength: 255 }) @IsString() @MaxLength(255) title: string;
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  testType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() passingScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() timeLimitMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isMandatory?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsArray() questions?: any;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
