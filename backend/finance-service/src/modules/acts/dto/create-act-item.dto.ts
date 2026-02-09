import { IsString, IsOptional, IsNumber, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateActItemDto {
  @ApiPropertyOptional({ description: 'Task ID' })
  @IsOptional()
  @IsNumber()
  taskId?: number;

  @ApiPropertyOptional({ description: 'Work template ID' })
  @IsOptional()
  @IsNumber()
  workTemplateId?: number;

  @ApiProperty({ description: 'Description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Quantity' })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Unit', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional({ description: 'Unit price' })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Total price' })
  @IsOptional()
  @IsNumber()
  totalPrice?: number;
}
