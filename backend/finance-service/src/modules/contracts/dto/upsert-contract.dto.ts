import { IsInt, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContractDto {
  @ApiPropertyOptional({ maxLength: 100, default: 'Б/Н' })
  @IsOptional() @IsString() @MaxLength(100)
  number?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsInt()
  projectId?: number | null;

  @ApiPropertyOptional()
  @IsOptional() @IsInt()
  clientId?: number | null;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional() @IsString()
  signedDate?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  amount?: number | null;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  fileUrl?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsInt()
  status?: number;
}

export class UpdateContractDto extends CreateContractDto {}
