import { IsString, IsOptional, IsBoolean, IsArray, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentTemplateDto {
  @ApiProperty({ description: 'Template name', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Template type', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  templateType?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Template content' })
  @IsOptional()
  @IsString()
  templateContent?: string;

  @ApiPropertyOptional({ description: 'Variables', type: [String] })
  @IsOptional()
  @IsArray()
  variables?: any;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
