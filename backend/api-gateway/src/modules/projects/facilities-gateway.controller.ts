import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ProxyService } from '../../common/services/proxy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Facilities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/facilities')
export class FacilitiesGatewayController {
  constructor(private readonly proxy: ProxyService) {}

  private auth(req: Request) { return req.headers.authorization || ''; }

  @Get('by-object/:objectId')
  findByObject(@Req() req: Request, @Param('objectId') objectId: string) {
    return this.proxy.forward('projects', { method: 'GET', path: `/facilities/by-object/${objectId}`, headers: { authorization: this.auth(req) } });
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.proxy.forward('projects', { method: 'GET', path: `/facilities/${id}`, headers: { authorization: this.auth(req) } });
  }

  @Post()
  create(@Req() req: Request, @Body() body: any) {
    return this.proxy.forward('projects', { method: 'POST', path: '/facilities', headers: { authorization: this.auth(req), 'content-type': 'application/json' }, data: body });
  }

  @Put(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxy.forward('projects', { method: 'PUT', path: `/facilities/${id}`, headers: { authorization: this.auth(req), 'content-type': 'application/json' }, data: body });
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.proxy.forward('projects', { method: 'DELETE', path: `/facilities/${id}`, headers: { authorization: this.auth(req) } });
  }

  @Post(':id/components')
  addComponent(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxy.forward('projects', { method: 'POST', path: `/facilities/${id}/components`, headers: { authorization: this.auth(req), 'content-type': 'application/json' }, data: body });
  }

  @Put(':id/components/:componentId')
  updateComponent(@Req() req: Request, @Param('id') id: string, @Param('componentId') componentId: string, @Body() body: any) {
    return this.proxy.forward('projects', { method: 'PUT', path: `/facilities/${id}/components/${componentId}`, headers: { authorization: this.auth(req), 'content-type': 'application/json' }, data: body });
  }

  @Delete(':id/components/:componentId')
  deleteComponent(@Req() req: Request, @Param('id') id: string, @Param('componentId') componentId: string) {
    return this.proxy.forward('projects', { method: 'DELETE', path: `/facilities/${id}/components/${componentId}`, headers: { authorization: this.auth(req) } });
  }
}
