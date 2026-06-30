import { IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTopicDto {
  @ApiPropertyOptional({ description: 'Topic name', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Emoji icon', maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  iconEmoji?: string;

  @ApiPropertyOptional({ description: 'Accent color (hex)', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({ description: 'Closed topic (only admins can post)' })
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;

  @ApiPropertyOptional({ description: 'Pinned to top of the topic list' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}
