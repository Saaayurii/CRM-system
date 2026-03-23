import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SavePushSubscriptionDto {
  @ApiProperty({ description: 'Push subscription endpoint URL' })
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @ApiProperty({ description: 'P-256 DH public key (base64url)' })
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @ApiProperty({ description: 'Auth secret (base64url)' })
  @IsString()
  @IsNotEmpty()
  auth: string;

  @ApiPropertyOptional({ description: 'User-Agent of the subscribing browser' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Role ID of the subscribing user' })
  @IsOptional()
  @IsNumber()
  roleId?: number;
}

export class DeletePushSubscriptionDto {
  @ApiProperty({ description: 'Push subscription endpoint to remove' })
  @IsString()
  @IsNotEmpty()
  endpoint: string;
}
