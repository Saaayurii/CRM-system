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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Res } from '@nestjs/common';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class CalendarGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  // Calendar Events
  @Get('calendar-events')
  @ApiOperation({ summary: 'Get all calendar events' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllCalendarEvents(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('calendar', {
      method: 'GET',
      path: '/calendar-events',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('calendar-events/:id')
  @ApiOperation({ summary: 'Get calendar event by ID' })
  async findOneCalendarEvent(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('calendar', {
      method: 'GET',
      path: `/calendar-events/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('calendar-events')
  @ApiOperation({ summary: 'Create calendar event' })
  async createCalendarEvent(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('calendar', {
      method: 'POST',
      path: '/calendar-events',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('calendar-events/:id')
  @ApiOperation({ summary: 'Update calendar event' })
  async updateCalendarEvent(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('calendar', {
      method: 'PUT',
      path: `/calendar-events/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('calendar-events/:id')
  @ApiOperation({ summary: 'Delete calendar event' })
  async removeCalendarEvent(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('calendar', {
      method: 'DELETE',
      path: `/calendar-events/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // -----------------------------
  // Calendar Feed (aggregated)
  // -----------------------------
  @Get('calendar-feed')
  @ApiOperation({ summary: 'Унифицированная лента событий из всех источников' })
  async feed(@Req() req: Request, @Query() query: Record<string, any>) {
    return this.proxyService.forward('calendar', {
      method: 'GET',
      path: '/calendar-feed',
      headers: { authorization: req.headers.authorization || '' },
      params: query,
    });
  }

  // -----------------------------
  // Custom event types
  // -----------------------------
  @Get('calendar-custom-event-types')
  async listCustomTypes(@Req() req: Request) {
    return this.proxyService.forward('calendar', {
      method: 'GET',
      path: '/calendar-custom-event-types',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('calendar-custom-event-types')
  async createCustomType(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('calendar', {
      method: 'POST',
      path: '/calendar-custom-event-types',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('calendar-custom-event-types/:id')
  async updateCustomType(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('calendar', {
      method: 'PUT',
      path: `/calendar-custom-event-types/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('calendar-custom-event-types/:id')
  async deleteCustomType(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('calendar', {
      method: 'DELETE',
      path: `/calendar-custom-event-types/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // -----------------------------
  // External integrations
  // -----------------------------
  @Get('calendar-integrations')
  async listIntegrations(@Req() req: Request) {
    return this.proxyService.forward('calendar', {
      method: 'GET',
      path: '/calendar-integrations',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get('calendar-integrations/providers')
  async listIntegrationProviders(@Req() req: Request) {
    return this.proxyService.forward('calendar', {
      method: 'GET',
      path: '/calendar-integrations/providers',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get('calendar-integrations/google/auth-url')
  async googleAuthUrl(@Req() req: Request) {
    return this.proxyService.forward('calendar', {
      method: 'GET',
      path: '/calendar-integrations/google/auth-url',
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('calendar-integrations/caldav')
  async connectCalDav(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('calendar', {
      method: 'POST',
      path: '/calendar-integrations/caldav',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Post('calendar-integrations/:id/sync')
  async syncIntegration(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('calendar', {
      method: 'POST',
      path: `/calendar-integrations/${id}/sync`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Delete('calendar-integrations/:id')
  async disconnectIntegration(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('calendar', {
      method: 'DELETE',
      path: `/calendar-integrations/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Public()
  @Get('calendar-integrations/google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.proxyService.forward('calendar', {
        method: 'GET',
        path: `/calendar-integrations/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
        headers: {},
      });
    } catch (_e) {
      /* downstream redirects; ignore */
    }
    const target = process.env.FRONTEND_URL || 'http://localhost:3030';
    res.redirect(`${target}/dashboard/settings/calendar-integrations?status=connected`);
  }
}
