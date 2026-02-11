import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateDictionaryTypeDto {
  @ApiProperty({ description: 'Unique code for the dictionary type', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code: string;

  @ApiProperty({ description: 'Name of the dictionary type', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Description of the dictionary type' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether this is a system dictionary type', default: false })
  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;
}
