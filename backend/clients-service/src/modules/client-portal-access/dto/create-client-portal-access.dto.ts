import {
  IsInt,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientPortalAccessDto {
  @ApiProperty()
  @IsInt()
  clientId: number;

  @ApiProperty()
  @IsInt()
  projectId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiPropertyOptional({ description: 'Логин для входа в портал' })
  @IsOptional()
  @IsString()
  login?: string;

  @ApiPropertyOptional({ description: 'Пароль (минимум 8 символов) — будет захеширован' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ description: 'Создать чат «Клиент — Проект» автоматически' })
  @IsOptional()
  @IsBoolean()
  createChat?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewProgress?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewPhotos?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewDocuments?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewFinancials?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
