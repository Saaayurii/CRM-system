import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'User password', example: 'SecurePassword123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ description: 'Account ID (required when same email exists in multiple companies)', example: 1 })
  @IsNumber()
  @IsOptional()
  accountId?: number;
}

export class TwoFactorLoginDto {
  @ApiProperty({ description: 'Short-lived challenge token returned by /auth/login' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: '6-digit one-time code from the authenticator app', example: '123456' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class Confirm2faDto {
  @ApiProperty({ description: 'Enrollment token returned by /auth/2fa/setup' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: '6-digit code from the authenticator app', example: '123456' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class Disable2faDto {
  @ApiProperty({ description: 'Current 6-digit code from the authenticator app', example: '123456' })
  @IsString()
  @IsNotEmpty()
  code: string;
}
