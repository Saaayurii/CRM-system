import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  IsIn,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const DOC_TYPES = ['snip', 'gost', 'sp', 'regional', 'other'] as const;
export const DOC_STATUSES = ['active', 'superseded', 'draft'] as const;

export class CreateNormDocumentDto {
  @ApiProperty({ maxLength: 500 }) @IsString() @MaxLength(500) title: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() categoryId?: number;
  @ApiPropertyOptional({ enum: DOC_TYPES })
  @IsOptional()
  @IsIn(DOC_TYPES as unknown as string[])
  docType?: string;
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() summary?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional({ enum: DOC_STATUSES })
  @IsOptional()
  @IsIn(DOC_STATUSES as unknown as string[])
  status?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() effectiveDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() supersededDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() supersededById?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() tags?: any;
  @ApiPropertyOptional() @IsOptional() @IsArray() attachments?: any;
  @ApiPropertyOptional() @IsOptional() @IsArray() relatedIds?: any;
  @ApiPropertyOptional() @IsOptional() @IsString() keywords?: string;
}

export class UpdateNormDocumentDto extends CreateNormDocumentDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  declare title: string;
}
