import {
  Controller,
  Get,
  Post,
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

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class AuditGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  // Event Logs (only GET list, GET :id, POST - no PUT/DELETE)
  @Get('event-logs')
  @ApiOperation({ summary: 'Get all event logs' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllEventLogs(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('audit', {
      method: 'GET',
      path: '/event-logs',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('event-logs/:id')
  @ApiOperation({ summary: 'Get event log by ID' })
  async findOneEventLog(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('audit', {
      method: 'GET',
      path: `/event-logs/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('event-logs')
  @ApiOperation({ summary: 'Create event log' })
  async createEventLog(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('audit', {
      method: 'POST',
      path: '/event-logs',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }
}
