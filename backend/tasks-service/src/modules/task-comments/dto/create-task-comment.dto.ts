import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
} from 'class-validator';

export class CreateTaskCommentDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  taskId: number;

  @ApiProperty({ example: 'This task needs review' })
  @IsString()
  @IsNotEmpty()
  commentText: string;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  userId?: number;

  @ApiPropertyOptional({ example: [] })
  @IsArray()
  @IsOptional()
  attachments?: any[];
}
