import {
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddMemberDto {
  @ApiProperty({ description: 'User ID to add to channel' })
  @IsNotEmpty()
  @IsInt()
  userId: number;

  @ApiPropertyOptional({ description: 'Member role', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  role?: string;
}
