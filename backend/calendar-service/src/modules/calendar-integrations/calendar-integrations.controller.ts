import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CalendarIntegrationsService } from './calendar-integrations.service';
import { ConnectCalDavDto } from './dto/connect-caldav.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Calendar / Integrations')
@ApiBearerAuth()
@Controller('calendar-integrations')
export class CalendarIntegrationsController {
  constructor(private readonly service: CalendarIntegrationsService) {}

  @Get()
  @ApiOperation({ summary: 'Список подключённых внешних календарей пользователя' })
  list(
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('userId') userId: number,
  ) {
    return this.service.listForUser(accountId, userId);
  }

  @Get('providers')
  @ApiOperation({ summary: 'Какие провайдеры настроены на сервере' })
  providers() {
    return this.service.listProviders();
  }

  @Get('google/auth-url')
  @ApiOperation({ summary: 'Получить ссылку для OAuth-авторизации Google' })
  googleAuthUrl(
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('userId') userId: number,
  ) {
    return { url: this.service.buildGoogleAuthUrl(accountId, userId) };
  }

  @Public()
  @Get('google/callback')
  @ApiOperation({ summary: 'OAuth callback от Google (без JWT)' })
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const ok = await this.service.handleGoogleCallback(code, state);
    const target = process.env.FRONTEND_URL || 'http://localhost:3030';
    res.redirect(
      `${target}/dashboard/settings/calendar-integrations?status=${ok ? 'connected' : 'error'}`,
    );
  }

  @Post('caldav')
  @ApiOperation({ summary: 'Подключить календарь по CalDAV (Yandex/Apple/прочие)' })
  connectCalDav(
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('userId') userId: number,
    @Body() dto: ConnectCalDavDto,
  ) {
    return this.service.connectCalDav(accountId, userId, dto);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Запустить синхронизацию вручную' })
  sync(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('userId') userId: number,
  ) {
    return this.service.sync(accountId, userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Отключить интеграцию' })
  disconnect(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('accountId') accountId: number,
    @CurrentUser('userId') userId: number,
  ) {
    return this.service.disconnect(accountId, userId, id);
  }
}
