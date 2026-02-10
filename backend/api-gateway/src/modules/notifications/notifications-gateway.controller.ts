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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class NotificationsGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  // Notifications
  @Get('notifications')
  @ApiOperation({ summary: 'Get all notifications' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'isRead', required: false })
  async findAllNotifications(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number, @Query('isRead') isRead?: boolean) {
    return this.proxyService.forward('notifications', {
      method: 'GET', path: '/notifications',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit, isRead },
    });
  }

  @Get('notifications/:id')
  @ApiOperation({ summary: 'Get notification by ID' })
  async findOneNotification(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('notifications', {
      method: 'GET', path: `/notifications/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('notifications')
  @ApiOperation({ summary: 'Create notification' })
  async createNotification(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('notifications', {
      method: 'POST', path: '/notifications',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('notifications/:id')
  @ApiOperation({ summary: 'Update notification' })
  async updateNotification(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('notifications', {
      method: 'PUT', path: `/notifications/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('notifications', {
      method: 'PUT', path: `/notifications/${id}/read`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Announcements
  @Get('announcements')
  @ApiOperation({ summary: 'Get all announcements' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllAnnouncements(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('notifications', {
      method: 'GET', path: '/announcements',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('announcements/:id')
  @ApiOperation({ summary: 'Get announcement by ID' })
  async findOneAnnouncement(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('notifications', {
      method: 'GET', path: `/announcements/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('announcements')
  @ApiOperation({ summary: 'Create announcement' })
  async createAnnouncement(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('notifications', {
      method: 'POST', path: '/announcements',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('announcements/:id')
  @ApiOperation({ summary: 'Update announcement' })
  async updateAnnouncement(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('notifications', {
      method: 'PUT', path: `/announcements/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('announcements/:id')
  @ApiOperation({ summary: 'Delete announcement' })
  async removeAnnouncement(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('notifications', {
      method: 'DELETE', path: `/announcements/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

}
