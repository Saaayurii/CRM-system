import {
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCalendarEventDto {
  @ApiPropertyOptional({ description: 'Event title', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Event description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Event type', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  eventType?: string;

  @ApiPropertyOptional({ description: 'Start date/time' })
  @IsOptional()
  @IsDateString()
  startDatetime?: string;

  @ApiPropertyOptional({ description: 'End date/time' })
  @IsOptional()
  @IsDateString()
  endDatetime?: string;

  @ApiPropertyOptional({ description: 'All day event' })
  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @ApiPropertyOptional({ description: 'Location', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ description: 'Organizer user ID' })
  @IsOptional()
  @IsInt()
  organizerId?: number;

  @ApiPropertyOptional({ description: 'Participants (JSON array)' })
  @IsOptional()
  participants?: any;

  @ApiPropertyOptional({ description: 'Reminders (JSON array)' })
  @IsOptional()
  reminders?: any;

  @ApiPropertyOptional({ description: 'Status', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @ApiPropertyOptional({ description: 'Recurrence rule', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  recurrenceRule?: string;

  @ApiPropertyOptional({ description: 'Project ID' })
  @IsOptional()
  @IsInt()
  projectId?: number;

  @ApiPropertyOptional({ description: 'Construction site ID' })
  @IsOptional()
  @IsInt()
  constructionSiteId?: number;

  @ApiPropertyOptional({ description: 'Task ID' })
  @IsOptional()
  @IsInt()
  taskId?: number;
}
