import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

export class RequestPhoneResetDto {
  @ApiProperty({ description: 'Телефон аккаунта (в любом формате)', example: '+7 999 123-45-67' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class VerifyPhoneResetDto {
  @ApiProperty({ description: 'Телефон, на который пришёл код', example: '+7 999 123-45-67' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: '6-значный код из SMS', example: '123456' })
  @IsString()
  @Length(4, 8)
  code: string;
}

export class ConfirmPhoneResetDto {
  @ApiProperty({ description: 'Одноразовый токен, выданный после проверки кода' })
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
