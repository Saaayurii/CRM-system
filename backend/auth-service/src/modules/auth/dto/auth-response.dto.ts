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

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  avatarUrl?: string;

  @ApiProperty({ example: 1 })
  accountId: number;

  @ApiPropertyOptional({ example: 1 })
  roleId?: number;

  @ApiPropertyOptional({ example: 'Project Manager' })
  position?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: true })
  isGlobalAdmin?: boolean;
}

export class TokenResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;
}

export class AccountChoiceDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiPropertyOptional() logoUrl?: string;
}

export class AuthResponseDto extends TokenResponseDto {
  @ApiPropertyOptional({ example: 42 })
  sessionId?: number;

  @ApiPropertyOptional({ type: UserResponseDto })
  user?: UserResponseDto;

  @ApiPropertyOptional({ type: [AccountChoiceDto], description: 'Present when email belongs to multiple companies' })
  accounts?: AccountChoiceDto[];
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;
}
