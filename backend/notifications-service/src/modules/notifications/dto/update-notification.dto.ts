import {
  IsOptional,
  IsString,
  IsInt,
  IsArray,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationDto {
  @ApiPropertyOptional({ description: 'Notification title', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

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
  })
  @IsOptional()
  @IsArray()
  channels?: string[];

  @ApiPropertyOptional({ description: 'Priority' })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ description: 'Is read' })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ description: 'Action URL', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  actionUrl?: string;
}
