import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  Sse,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Observable, map } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MaintenanceSubService } from '../../redis/maintenance-sub.service';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class SettingsGatewayController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly maintenanceSub: MaintenanceSubService,
  ) {}

  /** SSE stream — browser connects once, receives push events on maintenance changes */
  @SkipThrottle()
  @Sse('system-settings/events')
  @ApiOperation({ summary: 'SSE stream for maintenance mode changes' })
  maintenanceEvents(
    @CurrentUser('accountId') accountId: number,
  ): Observable<MessageEvent> {
    return this.maintenanceSub.forAccount(accountId).pipe(
      map((event) => ({
        data: event,
        type: 'maintenance',
      }) as unknown as MessageEvent),
    );
  }

  // System Settings (GET, PUT - no POST/DELETE)
  @Get('system-settings')
  @ApiOperation({ summary: 'Get all system settings' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllSystemSettings(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('settings', {
      method: 'GET',
      path: '/system-settings',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('system-settings/:id')
  @ApiOperation({ summary: 'Get system setting by ID' })
  async findOneSystemSetting(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('settings', {
      method: 'GET',
      path: `/system-settings/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Put('system-settings')
  @ApiOperation({ summary: 'Update current account system settings' })
  async updateCurrentSystemSettings(
    @Req() req: Request,
    @Body() body: any,
  ) {
    return this.proxyService.forward('settings', {
      method: 'PUT',
      path: '/system-settings',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('system-settings/:id')
  @ApiOperation({ summary: 'Update system setting' })
  async updateSystemSetting(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('settings', {
      method: 'PUT',
      path: `/system-settings/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  // User Preferences (GET, PUT - no POST/DELETE)
  @Get('user-preferences')
  @ApiOperation({ summary: 'Get all user preferences' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllUserPreferences(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('settings', {
      method: 'GET',
      path: '/user-preferences',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('user-preferences/:id')
  @ApiOperation({ summary: 'Get user preference by ID' })
  async findOneUserPreference(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('settings', {
      method: 'GET',
      path: `/user-preferences/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Put('user-preferences/:id')
  @ApiOperation({ summary: 'Update user preference' })
  async updateUserPreference(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('settings', {
      method: 'PUT',
      path: `/user-preferences/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }
}
