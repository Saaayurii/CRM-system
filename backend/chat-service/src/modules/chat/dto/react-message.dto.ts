import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReactMessageDto {
  @ApiProperty({ description: 'Reaction emoji', example: '👍' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  reaction: string;
}
