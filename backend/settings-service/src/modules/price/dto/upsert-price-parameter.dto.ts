import {
  ArrayMaxSize,
  IsArray,
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

export class PriceParameterValueInput {
  @ApiPropertyOptional()
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

export class CreatePriceParameterDto {
  @ApiProperty({ maxLength: 255 })
  @IsString() @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ enum: ['single', 'multi'] })
  @IsOptional() @IsIn(['single', 'multi'])
  selectionType?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsInt() @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ type: [PriceParameterValueInput] })
  @IsOptional() @IsArray() @ArrayMaxSize(200)
  @ValidateNested({ each: true }) @Type(() => PriceParameterValueInput)
  values?: PriceParameterValueInput[];
}

export class UpdatePriceParameterDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional() @IsString() @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ enum: ['single', 'multi'] })
  @IsOptional() @IsIn(['single', 'multi'])
  selectionType?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsInt() @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ type: [PriceParameterValueInput], description: 'Полная замена списка значений' })
  @IsOptional() @IsArray() @ArrayMaxSize(200)
  @ValidateNested({ each: true }) @Type(() => PriceParameterValueInput)
  values?: PriceParameterValueInput[];
}
