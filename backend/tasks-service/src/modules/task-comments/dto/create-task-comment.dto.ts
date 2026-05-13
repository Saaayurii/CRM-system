import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTaskCommentDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  taskId: number;

  @ApiPropertyOptional({ example: 'This task needs review' })
  @IsString()
  @IsOptional()
  commentText?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  userId?: number;

  @ApiPropertyOptional({ example: [] })
  @Transform(({ value }) => value)
  @IsArray()
  @IsOptional()
  attachments?: any[];
}
