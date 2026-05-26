import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsBoolean, Min, Max } from 'class-validator';

export class CreateClientInviteDto {
  @ApiProperty({ description: 'Проект, к которому будет привязан клиент после регистрации' })
  @IsInt()
  projectId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Срок действия в часах (0 = без ограничений)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24 * 365)
  expiresInHours?: number;

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
}
