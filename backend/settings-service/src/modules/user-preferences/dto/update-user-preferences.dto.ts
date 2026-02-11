import { IsOptional, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserPreferencesDto {
  @ApiPropertyOptional() @IsOptional() @IsObject() settings?: any;
  @ApiPropertyOptional() @IsOptional() @IsObject() notificationSettings?: any;
}
