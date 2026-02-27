import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RejectRegistrationRequestDto {
  @ApiPropertyOptional({ description: 'Rejection reason', example: 'Недостаточно данных' })
  @IsString()
  @IsOptional()
  reason?: string;
}
