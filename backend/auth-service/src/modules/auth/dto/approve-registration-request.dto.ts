import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveRegistrationRequestDto {
  @ApiProperty({ description: 'Role ID to assign', example: 10 })
  @IsNumber()
  @IsNotEmpty()
  roleId: number;

  @ApiPropertyOptional({ description: 'Job position', example: 'Каменщик' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  position?: string;
}
