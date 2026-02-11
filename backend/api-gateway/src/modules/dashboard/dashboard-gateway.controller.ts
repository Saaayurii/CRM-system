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

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class DashboardGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  // Dashboard Widgets
  @Get('dashboard-widgets')
  @ApiOperation({ summary: 'Get all dashboard widgets' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllDashboardWidgets(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('dashboard', {
      method: 'GET',
      path: '/dashboard-widgets',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('dashboard-widgets/:id')
  @ApiOperation({ summary: 'Get dashboard widget by ID' })
  async findOneDashboardWidget(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('dashboard', {
      method: 'GET',
      path: `/dashboard-widgets/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('dashboard-widgets')
  @ApiOperation({ summary: 'Create dashboard widget' })
  async createDashboardWidget(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('dashboard', {
      method: 'POST',
      path: '/dashboard-widgets',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('dashboard-widgets/:id')
  @ApiOperation({ summary: 'Update dashboard widget' })
  async updateDashboardWidget(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('dashboard', {
      method: 'PUT',
      path: `/dashboard-widgets/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('dashboard-widgets/:id')
  @ApiOperation({ summary: 'Delete dashboard widget' })
  async removeDashboardWidget(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('dashboard', {
      method: 'DELETE',
      path: `/dashboard-widgets/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }
}
