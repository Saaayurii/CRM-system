import { IsOptional, IsString, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTopicDto {
  @ApiProperty({ description: 'Topic name', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

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
}
