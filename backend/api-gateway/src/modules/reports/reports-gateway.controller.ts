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

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class ReportsGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  // Report Templates
  @Get('report-templates')
  @ApiOperation({ summary: 'Get all report templates' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllReportTemplates(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('reports', {
      method: 'GET',
      path: '/report-templates',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('report-templates/:id')
  @ApiOperation({ summary: 'Get report template by ID' })
  async findOneReportTemplate(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('reports', {
      method: 'GET',
      path: `/report-templates/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('report-templates')
  @ApiOperation({ summary: 'Create report template' })
  async createReportTemplate(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('reports', {
      method: 'POST',
      path: '/report-templates',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('report-templates/:id')
  @ApiOperation({ summary: 'Update report template' })
  async updateReportTemplate(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('reports', {
      method: 'PUT',
      path: `/report-templates/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('report-templates/:id')
  @ApiOperation({ summary: 'Delete report template' })
  async removeReportTemplate(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('reports', {
      method: 'DELETE',
      path: `/report-templates/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Generated Reports
  @Get('generated-reports')
  @ApiOperation({ summary: 'Get all generated reports' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllGeneratedReports(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.proxyService.forward('reports', {
      method: 'GET',
      path: '/generated-reports',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('generated-reports/:id')
  @ApiOperation({ summary: 'Get generated report by ID' })
  async findOneGeneratedReport(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('reports', {
      method: 'GET',
      path: `/generated-reports/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('generated-reports')
  @ApiOperation({ summary: 'Create generated report' })
  async createGeneratedReport(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('reports', {
      method: 'POST',
      path: '/generated-reports',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put('generated-reports/:id')
  @ApiOperation({ summary: 'Update generated report' })
  async updateGeneratedReport(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('reports', {
      method: 'PUT',
      path: `/generated-reports/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete('generated-reports/:id')
  @ApiOperation({ summary: 'Delete generated report' })
  async removeGeneratedReport(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('reports', {
      method: 'DELETE',
      path: `/generated-reports/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }
}
