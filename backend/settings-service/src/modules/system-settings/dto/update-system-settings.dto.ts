import {
  IsOptional,
  IsString,
  MaxLength,
  IsBoolean,
  IsIn,
  IsInt,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SystemSettingsPayloadDto {
  // ── Notifications ─────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  notifications_enabled?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  email_notifications?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  sms_notifications?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  push_notifications?: boolean;

  // ── Appearance ────────────────────────────────────
  @ApiPropertyOptional({ enum: ['light', 'dark', 'system'] })
  @IsOptional() @IsString() @IsIn(['light', 'dark', 'system'])
  theme?: string;

  // ── Maintenance ───────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  maintenance_mode?: boolean;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  maintenance_message?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 date string or empty string' })
  @IsOptional() @IsString()
  maintenance_end_time?: string;

  // ── Access ────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  allow_registration?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  require_invite?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  auto_approve_users?: boolean;

  // ── Security ──────────────────────────────────────
  @ApiPropertyOptional({ enum: [15, 30, 60, 120, 480] })
  @IsOptional() @IsInt() @IsIn([15, 30, 60, 120, 480])
  session_timeout_minutes?: number;

  @ApiPropertyOptional({ enum: [3, 5, 10] })
  @IsOptional() @IsInt() @IsIn([3, 5, 10])
  max_login_attempts?: number;

  @ApiPropertyOptional({ minimum: 6, maximum: 32 })
  @IsOptional() @IsInt() @Min(6) @Max(32)
  password_min_length?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  require_2fa?: boolean;

  // ── Localization ──────────────────────────────────
  @ApiPropertyOptional({ enum: ['ru', 'en'] })
  @IsOptional() @IsString() @IsIn(['ru', 'en'])
  language?: string;

  @ApiPropertyOptional({ enum: ['DD.MM.YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] })
  @IsOptional() @IsString() @IsIn(['DD.MM.YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'])
  date_format?: string;
}

export class UpdateSystemSettingsDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional() @IsString() @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ type: SystemSettingsPayloadDto })
  @IsOptional() @ValidateNested() @Type(() => SystemSettingsPayloadDto)
  settings?: SystemSettingsPayloadDto;
}
