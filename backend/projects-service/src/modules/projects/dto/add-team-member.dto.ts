import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class AddTeamMemberDto {
  @ApiProperty({ description: 'Team ID to assign to project', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  teamId: number;

  @ApiPropertyOptional({ description: 'Is primary team', example: false })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
