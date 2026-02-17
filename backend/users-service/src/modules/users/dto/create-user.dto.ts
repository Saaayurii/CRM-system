import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiPropertyOptional({ description: 'Account ID', example: 1 })
  @IsNumber()
  @IsOptional()
  accountId?: number;

  @ApiProperty({ description: 'User full name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiProperty({ description: 'Role ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  roleId: number;

  @ApiPropertyOptional({ description: 'Password' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ description: 'Is active', example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+7 999 123 4567',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Job position',
    example: 'Project Manager',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  position?: string;
}
