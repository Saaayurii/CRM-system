import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
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

export class PriceItemParamOptionInput {
  @ApiPropertyOptional({ description: 'id для сохранения существующей опции (необязательно)' })
  @IsOptional() @IsInt()
  id?: number;

  @ApiProperty({ maxLength: 255 })
  @IsString() @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ enum: ['coefficient', 'surcharge', 'none'] })
  @IsOptional() @IsIn(['coefficient', 'surcharge', 'none'])
  influenceType?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  influenceValue?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsInt() @Min(0)
  sortOrder?: number;
}

export class PriceItemParamGroupInput {
  @ApiPropertyOptional()
  @IsOptional() @IsInt()
  id?: number;

  @ApiPropertyOptional({ description: 'id параметра-источника из библиотеки' })
  @IsOptional() @IsInt()
  sourceParameterId?: number | null;

  @ApiProperty({ maxLength: 255 })
  @IsString() @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ enum: ['single', 'multi'] })
  @IsOptional() @IsIn(['single', 'multi'])
  selectionType?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  affectsPrice?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsInt() @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ type: [PriceItemParamOptionInput] })
  @IsOptional() @IsArray() @ArrayMaxSize(200)
  @ValidateNested({ each: true }) @Type(() => PriceItemParamOptionInput)
  options?: PriceItemParamOptionInput[];
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

  @ApiPropertyOptional({ description: 'Базовая цена для расчёта по формуле' })
  @IsOptional() @IsNumber()
  basePrice?: number | null;

  @ApiPropertyOptional({ enum: ['draft', 'active'] })
  @IsOptional() @IsIn(['draft', 'active'])
  status?: string;

  @ApiPropertyOptional({ enum: ['columns', 'formula'] })
  @IsOptional() @IsIn(['columns', 'formula'])
  calcMethod?: string;

  @ApiPropertyOptional({ description: 'Округление итоговой цены до N ₽ (0 = без округления)' })
  @IsOptional() @IsInt() @Min(0)
  rounding?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsInt() @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ type: [PriceItemPriceInput] })
  @IsOptional() @IsArray() @ArrayMaxSize(100)
  @ValidateNested({ each: true }) @Type(() => PriceItemPriceInput)
  prices?: PriceItemPriceInput[];

  @ApiPropertyOptional({ type: [PriceItemParamGroupInput] })
  @IsOptional() @IsArray() @ArrayMaxSize(50)
  @ValidateNested({ each: true }) @Type(() => PriceItemParamGroupInput)
  paramGroups?: PriceItemParamGroupInput[];
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
  @IsOptional() @IsNumber()
  basePrice?: number | null;

  @ApiPropertyOptional({ enum: ['draft', 'active'] })
  @IsOptional() @IsIn(['draft', 'active'])
  status?: string;

  @ApiPropertyOptional({ enum: ['columns', 'formula'] })
  @IsOptional() @IsIn(['columns', 'formula'])
  calcMethod?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsInt() @Min(0)
  rounding?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsInt() @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ type: [PriceItemPriceInput] })
  @IsOptional() @IsArray() @ArrayMaxSize(100)
  @ValidateNested({ each: true }) @Type(() => PriceItemPriceInput)
  prices?: PriceItemPriceInput[];

  @ApiPropertyOptional({ type: [PriceItemParamGroupInput] })
  @IsOptional() @IsArray() @ArrayMaxSize(50)
  @ValidateNested({ each: true }) @Type(() => PriceItemParamGroupInput)
  paramGroups?: PriceItemParamGroupInput[];
}
