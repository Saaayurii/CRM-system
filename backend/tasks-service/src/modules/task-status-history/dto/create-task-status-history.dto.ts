import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTaskStatusHistoryDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  taskId: number;

  @ApiPropertyOptional({
    example: 0,
    description: '0-new, 1-in_progress, 2-review, 3-completed, 4-cancelled',
  })
  @IsNumber()
  @IsOptional()
  oldStatus?: number;

  @ApiPropertyOptional({
    example: 1,
    description: '0-new, 1-in_progress, 2-review, 3-completed, 4-cancelled',
  })
  @IsNumber()
  @IsOptional()
  newStatus?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  changedByUserId?: number;

  @ApiPropertyOptional({ example: 'Task moved to in progress' })
  @IsString()
  @IsOptional()
  changeReason?: string;
}
