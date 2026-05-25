import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PriceItemPriceInput {
  @ApiProperty()
  @IsInt() @Min(1)
  projectCategoryId!: number;

  @ApiProperty()
  @IsNumber()
  price!: number;
}

export class CreatePriceItemDto {
  @ApiProperty({ maxLength: 500 })
  @IsString() @MaxLength(500)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsInt()
  categoryId?: number | null;

  @ApiPropertyOptional({ description: 'parent_id для модификатора (унификация)' })
  @IsOptional() @IsInt()
  parentId?: number | null;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional() @IsString() @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  cost?: number | null;

  @ApiPropertyOptional()
  @IsOptional() @IsInt() @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ type: [PriceItemPriceInput] })
  @IsOptional() @IsArray() @ArrayMaxSize(100)
  @ValidateNested({ each: true }) @Type(() => PriceItemPriceInput)
  prices?: PriceItemPriceInput[];
}

export class UpdatePriceItemDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsInt()
  categoryId?: number | null;

  @ApiPropertyOptional()
  @IsOptional() @IsInt()
  parentId?: number | null;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional() @IsString() @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  cost?: number | null;

  @ApiPropertyOptional()
  @IsOptional() @IsInt() @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ type: [PriceItemPriceInput] })
  @IsOptional() @IsArray() @ArrayMaxSize(100)
  @ValidateNested({ each: true }) @Type(() => PriceItemPriceInput)
  prices?: PriceItemPriceInput[];
}
