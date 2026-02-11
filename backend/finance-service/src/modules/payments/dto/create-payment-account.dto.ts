import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentAccountDto {
  @ApiProperty({ description: 'Payment account name', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Account type', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountType?: string;

  @ApiPropertyOptional({ description: 'Bank name', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bankName?: string;

  @ApiPropertyOptional({ description: 'Account number', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountNumber?: string;

  @ApiPropertyOptional({
    description: 'Currency',
    default: 'RUB',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ description: 'Initial balance', default: 0 })
  @IsOptional()
  @IsNumber()
  balance?: number;

  @ApiPropertyOptional({ description: 'Is account active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
