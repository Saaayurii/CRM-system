import { IsString, IsOptional, IsInt, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNormCategoryDto {
  @ApiProperty({ maxLength: 255 }) @IsString() @MaxLength(255) name: string;
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  icon?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() parentId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateNormCategoryDto extends CreateNormCategoryDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  declare name: string;
}
