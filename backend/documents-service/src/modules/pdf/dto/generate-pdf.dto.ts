import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsObject } from 'class-validator';

export class GeneratePdfDto {
  @ApiProperty({ example: 'project', description: 'project | task | user | inspection | defect' })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  entityId?: number;

  // Без декоратора forbidNonWhitelisted отвергает это поле (400). @IsObject обязателен.
  @ApiProperty({ description: 'Entity data object' })
  @IsObject()
  entityData: Record<string, unknown>;
}
