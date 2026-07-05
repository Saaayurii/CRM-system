import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import * as http from 'http';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AnyRole } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

/** Достаёт access-токен из httpOnly-cookie `crm_at` (для SSE через EventSource). */
function tokenFromCookie(req: Request): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const m = raw.match(/(?:^|;\s*)crm_at=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@AnyRole()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class NotificationsGatewayController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  // SSE proxy — forward EventSource to notifications-service
  @Public()
  @SkipThrottle()
  @Get('notifications/events')
  @ApiOperation({ summary: 'SSE stream for real-time notifications' })
  @ApiQuery({ name: 'token', required: true })
  async sseProxy(
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const notificationsUrl =
      this.configService.get<string>('services.notifications') ||
      'http://notifications-service:3010';

    // httpOnly-режим: EventSource не может положить токен в URL (JS не читает
    // httpOnly-cookie). Берём токен из cookie `crm_at` и передаём вниз тем же
    // ?token= — notifications-service остаётся без изменений.
    const authToken = token || tokenFromCookie(req);

    // Проверяем JWT ДО writeHead(200): иначе клиент получал 200 даже без токена,
    // так как headers пишутся немедленно, до ответа от notifications-service.
    if (!authToken) {
      res.status(401).json({ statusCode: 401, message: 'Unauthorized' });
      return;
    }
    try {
      this.jwtService.verify(authToken);
    } catch {
      res.status(401).json({ statusCode: 401, message: 'Unauthorized' });
      return;
    }

    const url = `${notificationsUrl}/notifications/events?token=${encodeURIComponent(authToken)}`;

    // SSE headers — no-transform stops intermediaries from buffering/compressing
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();
    // Disable Nagle so each small SSE frame is sent immediately
    res.socket?.setNoDelay(true);
    // Initial comment — hands the client bytes right away and primes proxies
    res.write(': connected\n\n');
    (res as unknown as { flush?: () => void }).flush?.();

    const proxyReq = http.request(
      url,
      { method: 'GET', headers: { Accept: 'text/event-stream' } },
      (proxyRes) => {
        proxyRes.on('data', (chunk: Buffer) => {
          res.write(chunk);
          // Force a flush in case a compression/buffering layer is present
          (res as unknown as { flush?: () => void }).flush?.();
        });
        proxyRes.on('end', () => res.end());
      },
    );

    proxyReq.on('error', () => {
      try {
        res.end();
      } catch {
        /* already closed */
      }
    });

    res.on('close', () => {
      proxyReq.destroy();
    });

    proxyReq.end();
  }

  // Web Push / VAPID
  @Public()
  @Get('notifications/vapid-public-key')
  @ApiOperation({ summary: 'Get VAPID public key for push subscription' })
  async getVapidPublicKey(@Req() req: Request) {
    return this.proxyService.forward('notifications', {
      method: 'GET',
      path: '/notifications/vapid-public-key',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('notifications/push-subscribe')
  @ApiOperation({ summary: 'Save push subscription' })
  async savePushSubscription(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('notifications', {
      method: 'POST',
      path: '/notifications/push-subscribe',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('notifications/push-subscribe')
  @ApiOperation({ summary: 'Remove push subscription' })
  async deletePushSubscription(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('notifications', {
      method: 'DELETE',
      path: '/notifications/push-subscribe',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  // Notifications
  @Get('notifications')
  @ApiOperation({ summary: 'Get all notifications' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'isRead', required: false })
  async findAllNotifications(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isRead') isRead?: boolean,
  ) {
    return this.proxyService.forward('notifications', {
      method: 'GET',
      path: '/notifications',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit, isRead },
    });
  }

  @Get('notifications/:id')
  @ApiOperation({ summary: 'Get notification by ID' })
  async findOneNotification(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('notifications', {
      method: 'GET',
      path: `/notifications/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('notifications')
  @ApiOperation({ summary: 'Create notification' })
  async createNotification(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('notifications', {
      method: 'POST',
      path: '/notifications',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('notifications/:id')
  @ApiOperation({ summary: 'Update notification' })
  async updateNotification(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('notifications', {
      method: 'PUT',
      path: `/notifications/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('notifications', {
      method: 'PUT',
      path: `/notifications/${id}/read`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Delete('notifications')
  @ApiOperation({ summary: 'Delete all notifications for current user' })
  async clearAllNotifications(@Req() req: Request) {
    return this.proxyService.forward('notifications', {
      method: 'DELETE',
      path: '/notifications',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Announcements
  @Get('announcements')
  @ApiOperation({ summary: 'Get all announcements' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllAnnouncements(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('notifications', {
      method: 'GET',
      path: '/announcements',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('announcements/:id')
  @ApiOperation({ summary: 'Get announcement by ID' })
  async findOneAnnouncement(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('notifications', {
      method: 'GET',
      path: `/announcements/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('announcements')
  @ApiOperation({ summary: 'Create announcement' })
  async createAnnouncement(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('notifications', {
      method: 'POST',
      path: '/announcements',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('announcements/:id')
  @ApiOperation({ summary: 'Update announcement' })
  async updateAnnouncement(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('notifications', {
      method: 'PUT',
      path: `/announcements/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('announcements/:id')
  @ApiOperation({ summary: 'Delete announcement' })
  async removeAnnouncement(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('notifications', {
      method: 'DELETE',
      path: `/announcements/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }
}
