import { IsString, IsOptional, IsNumber, IsObject, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBuildingObjectDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() projectId?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() constructionSiteId?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() parentId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) objectType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) classification?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) address?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() floorNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() parameters?: Record<string, any>;
}
