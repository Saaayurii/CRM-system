import {
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  IsArray,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAnnouncementDto {
  @ApiPropertyOptional({ description: 'Announcement title', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Announcement content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Announcement type',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  announcementType?: string;

  @ApiPropertyOptional({ description: 'Priority' })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ description: 'Target audience JSON' })
  @IsOptional()
  targetAudience?: any;

  @ApiPropertyOptional({ description: 'Pin announcement' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({
    description: 'Attachments array',
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  attachments?: any[];

  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
