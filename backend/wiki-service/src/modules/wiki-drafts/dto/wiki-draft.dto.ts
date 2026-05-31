import {
  IsString, IsOptional, IsInt, IsArray, MaxLength, IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWikiDraftDto {
  @ApiProperty({ maxLength: 255 }) @IsString() @MaxLength(255) title: string;
  @ApiPropertyOptional({ maxLength: 100 }) @IsOptional() @IsString() @MaxLength(100) category?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() parentPageId?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() tags?: any[];
  @ApiProperty({ description: 'Array of block objects' }) @IsArray() blocks: any[];
  @ApiPropertyOptional() @IsOptional() @IsInt() wikiPageId?: number;
}

export class UpdateWikiDraftDto {
  @ApiPropertyOptional({ maxLength: 255 }) @IsOptional() @IsString() @MaxLength(255) title?: string;
  @ApiPropertyOptional({ maxLength: 100 }) @IsOptional() @IsString() @MaxLength(100) category?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() parentPageId?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() tags?: any[];
  @ApiPropertyOptional() @IsOptional() @IsArray() blocks?: any[];
}

export class ReviewWikiDraftDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  action: 'approved' | 'rejected';

  @ApiPropertyOptional() @IsOptional() @IsString() reviewNote?: string;
}

export class AddDraftCommentDto {
  @ApiProperty() @IsString() text: string;
}
