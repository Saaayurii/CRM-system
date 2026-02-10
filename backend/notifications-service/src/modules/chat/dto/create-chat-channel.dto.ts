import {
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChatChannelDto {
  @ApiPropertyOptional({ description: 'Channel type', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  channelType?: string;

  @ApiPropertyOptional({ description: 'Channel name', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Channel description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Project ID' })
  @IsOptional()
  @IsInt()
  projectId?: number;

  @ApiPropertyOptional({ description: 'Construction site ID' })
  @IsOptional()
  @IsInt()
  constructionSiteId?: number;

  @ApiPropertyOptional({ description: 'Team ID' })
  @IsOptional()
  @IsInt()
  teamId?: number;

  @ApiPropertyOptional({ description: 'Is private channel', default: false })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({ description: 'Channel settings JSON' })
  @IsOptional()
  settings?: any;
}
