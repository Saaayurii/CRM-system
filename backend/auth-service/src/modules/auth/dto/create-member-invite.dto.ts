import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateMemberInviteDto {
  @ApiPropertyOptional({ description: 'Note / comment for this invite', example: 'Для Иванова' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  note?: string;

  @ApiPropertyOptional({ description: 'Expiry in hours (0 = never)', example: 72 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  expiresInHours?: number;
}
