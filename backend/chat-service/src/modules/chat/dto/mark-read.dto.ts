import { IsNotEmpty, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkReadDto {
  @ApiProperty({ description: 'Channel ID' })
  @IsNotEmpty()
  @IsInt()
  channelId: number;
}
