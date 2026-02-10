import { IsNotEmpty, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TypingDto {
  @ApiProperty({ description: 'Channel ID' })
  @IsNotEmpty()
  @IsInt()
  channelId: number;
}
