import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsInt, IsDateString } from 'class-validator';
import { CreateTimeOffRequestDto } from './create-time-off-request.dto';

export class UpdateTimeOffRequestDto extends PartialType(
  CreateTimeOffRequestDto,
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  status?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  approvedByUserId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  approvedAt?: string;
}
