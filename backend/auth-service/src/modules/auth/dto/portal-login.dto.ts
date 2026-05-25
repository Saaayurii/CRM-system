import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class PortalLoginDto {
  @ApiProperty({ description: 'Логин клиента в портале' })
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty({ description: 'Пароль клиента' })
  @IsString()
  @MinLength(1)
  password: string;
}

export class PortalMagicLoginDto {
  @ApiProperty({ description: 'Одноразовый magic-token из ссылки' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
