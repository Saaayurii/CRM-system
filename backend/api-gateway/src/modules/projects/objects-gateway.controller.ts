import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('BuildingObjects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/objects')
export class ObjectsGatewayController {
  constructor(private readonly proxy: ProxyService) {}

  private auth(req: Request) { return req.headers.authorization || ''; }

  @Get()
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'constructionSiteId', required: false })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiQuery({ name: 'objectType', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@Req() req: Request, @Query() query: any) {
    return this.proxy.forward('projects', { method: 'GET', path: '/objects', headers: { authorization: this.auth(req) }, params: query });
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.proxy.forward('projects', { method: 'GET', path: `/objects/${id}`, headers: { authorization: this.auth(req) } });
  }

  @Post()
  create(@Req() req: Request, @Body() body: any) {
    return this.proxy.forward('projects', { method: 'POST', path: '/objects', headers: { authorization: this.auth(req), 'content-type': 'application/json' }, data: body });
  }

  @Put(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxy.forward('projects', { method: 'PUT', path: `/objects/${id}`, headers: { authorization: this.auth(req), 'content-type': 'application/json' }, data: body });
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.proxy.forward('projects', { method: 'DELETE', path: `/objects/${id}`, headers: { authorization: this.auth(req) } });
  }
}
