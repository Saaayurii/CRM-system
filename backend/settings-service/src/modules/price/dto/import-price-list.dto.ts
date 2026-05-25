import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportPriceInput {
  @ApiProperty()
  @IsString() @MaxLength(255)
  projectCategoryName!: string;

  @ApiProperty()
  @IsNumber()
  price!: number;
}

export class ImportPriceRow {
  @ApiProperty({ maxLength: 500 })
  @IsString() @MaxLength(500)
  name!: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional() @IsString() @MaxLength(255)
  categoryName?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional() @IsString() @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  cost?: number;

  @ApiPropertyOptional({ type: [ImportPriceInput] })
  @IsOptional() @IsArray() @ArrayMaxSize(100)
  @ValidateNested({ each: true }) @Type(() => ImportPriceInput)
  prices?: ImportPriceInput[];
}

export class ImportPriceListDto {
  @ApiProperty({ type: [ImportPriceRow] })
  @IsArray() @ArrayMaxSize(5000)
  @ValidateNested({ each: true }) @Type(() => ImportPriceRow)
  rows!: ImportPriceRow[];

  @ApiPropertyOptional({ description: 'Не сохранять, только проверить' })
  @IsOptional() @IsBoolean()
  dryRun?: boolean;

  @ApiPropertyOptional({ description: 'Создавать недостающие категории прайса' })
  @IsOptional() @IsBoolean()
  createMissingCategories?: boolean;

  @ApiPropertyOptional({ description: 'Создавать недостающие колонки цен (категории проектов)' })
  @IsOptional() @IsBoolean()
  createMissingProjectCategories?: boolean;
}
