import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConnectCalDavDto {
  @ApiProperty({ enum: ['yandex', 'apple', 'generic'] })
  @IsIn(['yandex', 'apple', 'generic'])
  provider: 'yandex' | 'apple' | 'generic';

  @ApiProperty({ description: 'Логин / email' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ description: 'Пароль приложения (app-specific password)' })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: 'CalDAV URL. Если пусто — определится по провайдеру.' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ description: 'ID внешнего календаря (если у пользователя их несколько)' })
  @IsOptional()
  @IsString()
  externalCalendarId?: string;

  @ApiPropertyOptional({ enum: ['pull', 'push', 'bidirectional'] })
  @IsOptional()
  @IsIn(['pull', 'push', 'bidirectional'])
  syncDirection?: 'pull' | 'push' | 'bidirectional';
}
