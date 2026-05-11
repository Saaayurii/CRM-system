import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiPropertyOptional({ example: '+7 999 123 4567' })
  phone?: string;

  @ApiPropertyOptional({ example: 'Project Manager' })
  position?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  avatarUrl?: string;

  @ApiProperty({ example: 1 })
  accountId: number;

  @ApiProperty({ example: 1 })
  roleId: number;

  @ApiPropertyOptional()
  role?: {
    code: string;
    name: string;
  };

  @ApiPropertyOptional({ example: '2023-01-15' })
  hireDate?: string;

  @ApiPropertyOptional({ example: '1990-05-20' })
  birthDate?: string;

  @ApiPropertyOptional({ example: 'г. Москва, ул. Примерная, 1' })
  address?: string;

  @ApiPropertyOptional({ description: 'Hashed password (read-only)' })
  passwordDigest?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 1 })
  availability: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}
