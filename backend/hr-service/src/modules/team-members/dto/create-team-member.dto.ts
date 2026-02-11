import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTeamMemberDto {
  @ApiProperty()
  @IsInt()
  teamId: number;

  @ApiProperty()
  @IsInt()
  userId: number;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  roleInTeam?: string;
}
