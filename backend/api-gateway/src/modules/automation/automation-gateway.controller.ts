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

@ApiTags('Automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class AutomationGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  // Automation Rules
  @Get('automation-rules')
  @ApiOperation({ summary: 'Get all automation rules' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllAutomationRules(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('automation', {
      method: 'GET', path: '/automation-rules',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('automation-rules/:id')
  @ApiOperation({ summary: 'Get automation rule by ID' })
  async findOneAutomationRule(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('automation', {
      method: 'GET', path: `/automation-rules/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('automation-rules')
  @ApiOperation({ summary: 'Create automation rule' })
  async createAutomationRule(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('automation', {
      method: 'POST', path: '/automation-rules',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('automation-rules/:id')
  @ApiOperation({ summary: 'Update automation rule' })
  async updateAutomationRule(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('automation', {
      method: 'PUT', path: `/automation-rules/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('automation-rules/:id')
  @ApiOperation({ summary: 'Delete automation rule' })
  async removeAutomationRule(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('automation', {
      method: 'DELETE', path: `/automation-rules/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Execution Logs (only GET list, GET :id, POST)
  @Get('execution-logs')
  @ApiOperation({ summary: 'Get all execution logs' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllExecutionLogs(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('automation', {
      method: 'GET', path: '/execution-logs',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('execution-logs/:id')
  @ApiOperation({ summary: 'Get execution log by ID' })
  async findOneExecutionLog(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('automation', {
      method: 'GET', path: `/execution-logs/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('execution-logs')
  @ApiOperation({ summary: 'Create execution log' })
  async createExecutionLog(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('automation', {
      method: 'POST', path: '/execution-logs',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }
}
