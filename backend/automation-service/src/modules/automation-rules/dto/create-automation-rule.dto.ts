import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAutomationRuleDto {
  @ApiProperty({ maxLength: 255 }) @IsString() @MaxLength(255) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ruleType?: string;
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  triggerEvent?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() triggerConditions?: any;
  @ApiPropertyOptional() @IsOptional() @IsArray() actions?: any;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
