import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdatePassportDto {
  @ApiProperty({
    description:
      'Passport section key (general | access | engineering | infrastructure | security | maintenance | contacts)',
  })
  @IsNotEmpty()
  @IsString()
  section: string;

  @ApiPropertyOptional({
    description: 'Full new value for the section (object or array)',
  })
  @IsOptional()
  data?: any;

  @ApiPropertyOptional({ description: 'Display name of the editing user' })
  @IsOptional()
  @IsString()
  userName?: string;
}
