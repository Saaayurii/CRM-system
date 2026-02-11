import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDashboardWidgetDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  widgetType?: string;
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() configuration?: any;
  @ApiPropertyOptional() @IsOptional() @IsInt() position?: number;
  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  size?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVisible?: boolean;
}
