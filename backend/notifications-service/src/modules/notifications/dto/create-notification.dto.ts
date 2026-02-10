import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
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

  @ApiPropertyOptional({
    description: 'Notification type',
    maxLength: 100,
  })
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

  @ApiPropertyOptional({
    description: 'Notification channels',
    type: [String],
    default: ['in_app'],
  })
  @IsOptional()
  @IsArray()
  channels?: string[];

  @ApiPropertyOptional({
    description: 'Priority (1=high, 2=medium, 3=low)',
    default: 2,
  })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({
    description: 'Action URL',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  actionUrl?: string;
}
