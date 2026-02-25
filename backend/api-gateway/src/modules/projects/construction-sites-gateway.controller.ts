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

@ApiTags('Construction Sites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/construction-sites')
export class ConstructionSitesGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get()
  @ApiOperation({ summary: 'Get all construction sites' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('projectId') projectId?: number,
    @Query('status') status?: number,
  ) {
    return this.proxyService.forward('projects', {
      method: 'GET',
      path: '/construction-sites',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit, projectId, status },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get construction site by ID' })
  async findOne(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('projects', {
      method: 'GET',
      path: `/construction-sites/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create construction site' })
  async create(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('projects', {
      method: 'POST',
      path: '/construction-sites',
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update construction site' })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.proxyService.forward('projects', {
      method: 'PUT',
      path: `/construction-sites/${id}`,
      headers: {
        authorization: req.headers.authorization || '',
        'content-type': 'application/json',
      },
      data: body,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete construction site' })
  async remove(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('projects', {
      method: 'DELETE',
      path: `/construction-sites/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }
}
