import { ArrayMaxSize, IsArray, IsInt, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CalcSelectionDto {
  @ApiProperty()
  @IsInt()
  groupId!: number;

  @ApiProperty({ type: [Number] })
  @IsArray() @ArrayMaxSize(50) @IsInt({ each: true })
  optionIds!: number[];
}

export class CalcPriceDto {
  @ApiProperty({ type: [CalcSelectionDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(50)
  @ValidateNested({ each: true }) @Type(() => CalcSelectionDto)
  selections?: CalcSelectionDto[];
}
