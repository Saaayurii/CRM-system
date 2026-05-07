import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterCompanyDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  companyName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  adminName: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  adminEmail: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  adminPassword: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminPhone?: string;
}
