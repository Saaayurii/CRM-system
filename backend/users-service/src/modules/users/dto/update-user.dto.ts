import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Email address', example: 'user@example.com' })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'User full name', example: 'John Doe' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

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

  @ApiPropertyOptional({ description: 'Role ID', example: 2 })
  @IsNumber()
  @IsOptional()
  roleId?: number;

  @ApiPropertyOptional({ description: 'User active status', example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      'Availability status (0-offline, 1-online, 2-busy, 3-vacation, 4-sick)',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  availability?: number;

  @ApiPropertyOptional({
    description: 'Avatar URL',
    example: 'http://localhost:3000/uploads/avatars/uuid.jpg',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Hire date', example: '2023-01-15' })
  @IsDateString()
  @IsOptional()
  hireDate?: string;

  @ApiPropertyOptional({ description: 'Birth date', example: '1990-05-20' })
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @ApiPropertyOptional({ description: 'Address', example: 'г. Москва, ул. Примерная, 1' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: 'Set new password (admin use)', minLength: 6 })
  @IsString()
  @IsOptional()
  @MinLength(6)
  newPassword?: string;
}
