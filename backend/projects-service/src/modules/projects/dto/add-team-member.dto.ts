import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddTeamMemberDto {
  @ApiProperty({ description: 'User ID to add to team', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @ApiPropertyOptional({ description: 'Role in project', example: 'Прораб' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  role?: string;
}
