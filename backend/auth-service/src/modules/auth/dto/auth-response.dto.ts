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

  @ApiPropertyOptional({ example: false, description: 'User must change password on next login' })
  mustChangePassword?: boolean;
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

export class TwoFactorChallengeDto {
  /** 'verify' — user already enrolled; 'setup' — user must scan the QR first. */
  @ApiProperty({ enum: ['verify', 'setup'] })
  mode: 'verify' | 'setup';

  /** Short-lived challenge token to be sent back with the OTP code. */
  @ApiProperty()
  token: string;

  /** otpauth:// URI (setup mode only). */
  @ApiPropertyOptional()
  otpauthUrl?: string;

  /** QR code as a data:image/png;base64 URL (setup mode only). */
  @ApiPropertyOptional()
  qrDataUrl?: string;

  /** Raw base32 secret for manual entry (setup mode only). */
  @ApiPropertyOptional()
  secret?: string;
}

export class AuthResponseDto extends TokenResponseDto {
  @ApiPropertyOptional({ example: 42 })
  sessionId?: number;

  @ApiPropertyOptional({ type: UserResponseDto })
  user?: UserResponseDto;

  @ApiPropertyOptional({ type: [AccountChoiceDto], description: 'Present when email belongs to multiple companies' })
  accounts?: AccountChoiceDto[];

  @ApiPropertyOptional({
    type: TwoFactorChallengeDto,
    description:
      'Present when the account requires 2FA. accessToken/refreshToken are empty until the OTP is confirmed via POST /auth/2fa/login.',
  })
  twoFactor?: TwoFactorChallengeDto;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;
}
