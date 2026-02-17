import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class GeneratePdfDto {
  @ApiProperty({ example: 'project', description: 'project | task | user' })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  entityId?: number;

  @ApiProperty({ description: 'Entity data object' })
  entityData: Record<string, unknown>;
}
