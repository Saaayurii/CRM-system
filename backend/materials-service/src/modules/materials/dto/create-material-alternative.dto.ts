import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMaterialAlternativeDto {
  @ApiProperty({ description: 'Alternative material ID', example: 2 })
  @IsNumber()
  @IsNotEmpty()
  alternativeMaterialId: number;

  @ApiPropertyOptional({ description: 'Notes about the alternative' })
  @IsString()
  @IsOptional()
  notes?: string;
}
