import { IsString, IsOptional, IsBoolean, IsInt, IsArray, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWikiPageDto {
  @ApiProperty({ maxLength: 255 }) @IsString() @MaxLength(255) title: string;
  @ApiPropertyOptional({ maxLength: 255 }) @IsOptional() @IsString() @MaxLength(255) slug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional({ maxLength: 100 }) @IsOptional() @IsString() @MaxLength(100) category?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() parentPageId?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublic?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsArray() allowedRoles?: any;
  @ApiPropertyOptional() @IsOptional() @IsArray() tags?: any;
  @ApiPropertyOptional() @IsOptional() @IsArray() attachments?: any;
}
