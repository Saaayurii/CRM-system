import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompanyBankAccountDto {
  @ApiProperty({ maxLength: 255 })
  @IsString() @MaxLength(255)
  bankName!: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional() @IsString() @MaxLength(20)
  bik?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional() @IsString() @MaxLength(50)
  settlementAccount?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional() @IsString() @MaxLength(50)
  correspondentAccount?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional() @IsString() @MaxLength(20)
  bankInn?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  bankAddress?: string;
}

export class UpdateCompanyBankAccountDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional() @IsString() @MaxLength(255)
  bankName?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional() @IsString() @MaxLength(20)
  bik?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional() @IsString() @MaxLength(50)
  settlementAccount?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional() @IsString() @MaxLength(50)
  correspondentAccount?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional() @IsString() @MaxLength(20)
  bankInn?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  bankAddress?: string;
}
