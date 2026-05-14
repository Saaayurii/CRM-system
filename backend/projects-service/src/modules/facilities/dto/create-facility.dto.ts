import { IsString, IsOptional, IsNumber, IsObject, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFacilityDto {
  @ApiProperty() @IsNumber() objectId: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) facilityType?: string;
  @ApiProperty() @IsString() @MaxLength(255) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() configuration?: Record<string, any>;
}

export class CreateComponentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) componentType?: string;
  @ApiProperty() @IsNumber() position: number;
  @ApiProperty() @IsString() @MaxLength(255) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() configuration?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) status?: string;
}

export class UpdateFacilityDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) facilityType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() configuration?: Record<string, any>;
}

export class UpdateComponentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) componentType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() position?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() configuration?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) status?: string;
}
