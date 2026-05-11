import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateInviteDto {
  @ApiPropertyOptional({ description: 'Optional note for this invite' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Expiry in hours (default: 72). Pass 0 for no expiry.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  expiresInHours?: number;
}
