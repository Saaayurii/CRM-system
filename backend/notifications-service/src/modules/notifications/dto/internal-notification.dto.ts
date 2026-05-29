import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Service-to-service notification creation. Unlike CreateNotificationDto,
 * `accountId` is taken from the body (no JWT on internal calls).
 */
export class InternalCreateNotificationDto {
  @ApiProperty({ description: 'Account ID (tenant)' })
  @IsNotEmpty()
  @IsInt()
  accountId: number;

  @ApiProperty({ description: 'User ID to notify' })
  @IsNotEmpty()
  @IsInt()
  userId: number;

  @ApiProperty({ description: 'Notification title', maxLength: 255 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Notification message' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Notification type', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  notificationType?: string;

  @ApiPropertyOptional({ description: 'Entity type', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityType?: string;

  @ApiPropertyOptional({ description: 'Entity ID' })
  @IsOptional()
  @IsInt()
  entityId?: number;

  @ApiPropertyOptional({ description: 'Notification channels', type: [String] })
  @IsOptional()
  @IsArray()
  channels?: string[];

  @ApiPropertyOptional({ description: 'Priority (1=low, 2=medium, 3=high)' })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ description: 'Action URL', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  actionUrl?: string;
}

/**
 * Broadcast a notification to a computed audience: every active user holding
 * one of `roleIds`, plus any explicit `userIds`, minus `excludeUserId` (the actor).
 */
export class BroadcastNotificationDto {
  @ApiProperty({ description: 'Account ID (tenant)' })
  @IsNotEmpty()
  @IsInt()
  accountId: number;

  @ApiPropertyOptional({
    description: 'Role IDs to fan out to (e.g. [1,2,4] = admins + PMs)',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  roleIds?: number[];

  @ApiPropertyOptional({
    description: 'Explicit recipient user IDs (affected users)',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  userIds?: number[];

  @ApiPropertyOptional({ description: 'User ID to exclude (the actor)' })
  @IsOptional()
  @IsInt()
  excludeUserId?: number;

  @ApiProperty({ description: 'Notification title', maxLength: 255 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Notification message' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Notification type', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  notificationType?: string;

  @ApiPropertyOptional({ description: 'Entity type', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityType?: string;

  @ApiPropertyOptional({ description: 'Entity ID' })
  @IsOptional()
  @IsInt()
  entityId?: number;

  @ApiPropertyOptional({ description: 'Notification channels', type: [String] })
  @IsOptional()
  @IsArray()
  channels?: string[];

  @ApiPropertyOptional({ description: 'Priority (1=low, 2=medium, 3=high)' })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ description: 'Action URL', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  actionUrl?: string;
}
