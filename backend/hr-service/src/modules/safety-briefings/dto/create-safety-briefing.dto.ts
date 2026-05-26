import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  IsDateString,
  IsIn,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export const BRIEFING_TYPES = [
  'introductory',
  'primary',
  'repeat',
  'targeted',
  'unscheduled',
] as const;

export class BriefingTopicDto {
  @IsString()
  @IsNotEmpty()
  topic!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class BriefingParticipantDto {
  @IsInt()
  userId!: number;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @IsString()
  userPosition?: string;
}

export class CreateSafetyBriefingDto {
  @IsIn(BRIEFING_TYPES as unknown as string[])
  briefingType!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  projectId?: number;

  @IsOptional()
  @IsInt()
  constructionSiteId?: number;

  @IsOptional()
  @IsInt()
  instructorId?: number;

  @IsOptional()
  @IsString()
  instructorName?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsDateString()
  conductedAt?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsInt()
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  validityMonths?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  materials?: any[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BriefingTopicDto)
  topics?: BriefingTopicDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BriefingParticipantDto)
  participants?: BriefingParticipantDto[];
}
