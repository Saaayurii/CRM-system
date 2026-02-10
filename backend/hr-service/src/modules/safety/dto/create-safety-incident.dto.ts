import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsInt, IsArray, MaxLength } from 'class-validator';

export class CreateSafetyIncidentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  projectId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  constructionSiteId?: number;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  incidentNumber: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  incidentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  severity?: number;

  @ApiProperty()
  @IsDateString()
  incidentDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationDescription?: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  affectedUsers?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rootCause?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  contributingFactors?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  immediateActions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  correctiveActions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preventiveActions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  reportedByUserId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  investigatedByUserId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  status?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  photos?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  documents?: string[];
}
