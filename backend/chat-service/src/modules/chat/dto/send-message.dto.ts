import {
  IsOptional,
  IsString,
  IsInt,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiPropertyOptional({ description: 'Message text' })
  @IsOptional()
  @IsString()
  messageText?: string;

  @ApiPropertyOptional({
    description: 'Message type',
    default: 'text',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  messageType?: string;

  @ApiPropertyOptional({
    description: 'Attachments array',
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  attachments?: any[];

  @ApiPropertyOptional({ description: 'Reply to message ID' })
  @IsOptional()
  @IsInt()
  replyToMessageId?: number;
}
