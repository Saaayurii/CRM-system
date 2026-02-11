import { IsInt, IsOptional, IsBoolean, IsObject, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExecutionLogDto {
  @ApiProperty() @IsInt() automationRuleId: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() triggerData?: any;
  @ApiPropertyOptional() @IsOptional() @IsObject() executionResult?: any;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() success?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() errorMessage?: string;
}
