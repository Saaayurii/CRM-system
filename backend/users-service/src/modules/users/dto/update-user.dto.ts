import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateUserDto {
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
}
