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

@ApiTags('Inspections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class InspectionsGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  // Inspections
  @Get('inspections')
  @ApiOperation({ summary: 'Get all inspections' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAllInspections(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number, @Query('status') status?: number) {
    return this.proxyService.forward('inspections', {
      method: 'GET', path: '/inspections',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit, status },
    });
  }

  @Get('inspections/:id')
  @ApiOperation({ summary: 'Get inspection by ID' })
  async findOneInspection(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('inspections', {
      method: 'GET', path: `/inspections/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('inspections')
  @ApiOperation({ summary: 'Create inspection' })
  async createInspection(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('inspections', {
      method: 'POST', path: '/inspections',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('inspections/:id')
  @ApiOperation({ summary: 'Update inspection' })
  async updateInspection(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('inspections', {
      method: 'PUT', path: `/inspections/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('inspections/:id')
  @ApiOperation({ summary: 'Delete inspection' })
  async removeInspection(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('inspections', {
      method: 'DELETE', path: `/inspections/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Inspection Templates
  @Get('inspection-templates')
  @ApiOperation({ summary: 'Get all inspection templates' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllTemplates(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('inspections', {
      method: 'GET', path: '/inspection-templates',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('inspection-templates/:id')
  @ApiOperation({ summary: 'Get inspection template by ID' })
  async findOneTemplate(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('inspections', {
      method: 'GET', path: `/inspection-templates/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('inspection-templates')
  @ApiOperation({ summary: 'Create inspection template' })
  async createTemplate(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('inspections', {
      method: 'POST', path: '/inspection-templates',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('inspection-templates/:id')
  @ApiOperation({ summary: 'Update inspection template' })
  async updateTemplate(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('inspections', {
      method: 'PUT', path: `/inspection-templates/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('inspection-templates/:id')
  @ApiOperation({ summary: 'Delete inspection template' })
  async removeTemplate(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('inspections', {
      method: 'DELETE', path: `/inspection-templates/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Defects
  @Get('defects')
  @ApiOperation({ summary: 'Get all defects' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAllDefects(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number, @Query('status') status?: number) {
    return this.proxyService.forward('inspections', {
      method: 'GET', path: '/defects',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit, status },
    });
  }

  @Get('defects/:id')
  @ApiOperation({ summary: 'Get defect by ID' })
  async findOneDefect(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('inspections', {
      method: 'GET', path: `/defects/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('defects')
  @ApiOperation({ summary: 'Create defect' })
  async createDefect(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('inspections', {
      method: 'POST', path: '/defects',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('defects/:id')
  @ApiOperation({ summary: 'Update defect' })
  async updateDefect(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('inspections', {
      method: 'PUT', path: `/defects/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('defects/:id')
  @ApiOperation({ summary: 'Delete defect' })
  async removeDefect(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('inspections', {
      method: 'DELETE', path: `/defects/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Defect Templates
  @Get('defect-templates')
  @ApiOperation({ summary: 'Get all defect templates' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllDefectTemplates(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('inspections', {
      method: 'GET', path: '/defect-templates',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit },
    });
  }

  @Get('defect-templates/:id')
  @ApiOperation({ summary: 'Get defect template by ID' })
  async findOneDefectTemplate(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('inspections', {
      method: 'GET', path: `/defect-templates/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post('defect-templates')
  @ApiOperation({ summary: 'Create defect template' })
  async createDefectTemplate(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('inspections', {
      method: 'POST', path: '/defect-templates',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put('defect-templates/:id')
  @ApiOperation({ summary: 'Update defect template' })
  async updateDefectTemplate(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('inspections', {
      method: 'PUT', path: `/defect-templates/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete('defect-templates/:id')
  @ApiOperation({ summary: 'Delete defect template' })
  async removeDefectTemplate(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('inspections', {
      method: 'DELETE', path: `/defect-templates/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }
}
