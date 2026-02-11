import { IsInt, IsOptional, IsBoolean, IsDateString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTestAttemptDto {
  @ApiProperty() @IsInt() knowledgeTestId: number;
  @ApiProperty() @IsInt() userId: number;
  @ApiProperty() @IsDateString() startedAt: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() completedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() score?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() passed?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsObject() answers?: any;
  @ApiPropertyOptional() @IsOptional() @IsInt() attemptNumber?: number;
}
