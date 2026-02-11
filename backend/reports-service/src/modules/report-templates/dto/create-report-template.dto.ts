import { IsString, IsOptional, IsBoolean, IsArray, IsObject, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReportTemplateDto {
  @ApiProperty({ description: 'Template name', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Report type', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reportType?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Configuration' })
  @IsOptional()
  @IsObject()
  configuration?: any;

  @ApiPropertyOptional({ description: 'Allowed roles', type: [Number] })
  @IsOptional()
  @IsArray()
  allowedRoles?: any;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
