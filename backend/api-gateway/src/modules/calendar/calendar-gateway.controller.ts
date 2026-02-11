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
import { Request } from 'express';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

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

  // Calendar Categories
  @Get('calendar-categories')
  @ApiOperation({ summary: 'Get all calendar categories' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllCalendarCategories(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('calendar', {
      method: 'GET',
      path: '/calendar-categories',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('calendar-categories/:id')
  @ApiOperation({ summary: 'Get calendar category by ID' })
  async findOneCalendarCategory(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('calendar', {
      method: 'GET',
      path: `/calendar-categories/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('calendar-categories')
  @ApiOperation({ summary: 'Create calendar category' })
  async createCalendarCategory(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('calendar', {
      method: 'POST',
      path: '/calendar-categories',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('calendar-categories/:id')
  @ApiOperation({ summary: 'Update calendar category' })
  async updateCalendarCategory(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('calendar', {
      method: 'PUT',
      path: `/calendar-categories/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('calendar-categories/:id')
  @ApiOperation({ summary: 'Delete calendar category' })
  async removeCalendarCategory(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('calendar', {
      method: 'DELETE',
      path: `/calendar-categories/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }
}
