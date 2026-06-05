import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({ description: 'Email аккаунта для восстановления', example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ConfirmPasswordResetDto {
  @ApiProperty({ description: 'Токен из ссылки в письме' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'ID пользователей (аккаунтов), для которых восстанавливается доступ',
    example: [12, 47],
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  userIds: number[];

  @ApiProperty({ description: 'Новый пароль (мин. 8 символов)', example: 'NewSecurePass123' })
  @IsString()
  @MinLength(8, { message: 'Пароль должен быть не короче 8 символов' })
  password: string;
}
