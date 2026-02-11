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

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/projects')
export class ProjectsGatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get()
  @ApiOperation({ summary: 'Get all projects' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: number,
  ) {
    return this.proxyService.forward('projects', {
      method: 'GET',
      path: '/projects',
      headers: { authorization: req.headers.authorization || '' },
      params: { page, limit, status },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  async findOne(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('projects', {
      method: 'GET',
      path: `/projects/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create new project' })
  async create(@Req() req: Request, @Body() body: any) {
    return this.proxyService.forward('projects', {
      method: 'POST',
      path: '/projects',
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update project' })
  async update(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('projects', {
      method: 'PUT',
      path: `/projects/${id}`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project' })
  async remove(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('projects', {
      method: 'DELETE',
      path: `/projects/${id}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Get(':id/team')
  @ApiOperation({ summary: 'Get project team' })
  async getTeam(@Req() req: Request, @Param('id') id: string) {
    return this.proxyService.forward('projects', {
      method: 'GET',
      path: `/projects/${id}/team`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  @Post(':id/team')
  @ApiOperation({ summary: 'Add team member' })
  async addTeamMember(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('projects', {
      method: 'POST',
      path: `/projects/${id}/team`,
      headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' },
      data: body,
    });
  }

  @Delete(':id/team/:userId')
  @ApiOperation({ summary: 'Remove team member' })
  async removeTeamMember(@Req() req: Request, @Param('id') id: string, @Param('userId') userId: string) {
    return this.proxyService.forward('projects', {
      method: 'DELETE',
      path: `/projects/${id}/team/${userId}`,
      headers: { authorization: req.headers.authorization || '' },
    });
  }

  // Construction Sites
  @Get(':id/construction-sites')
  @ApiOperation({ summary: 'Get project construction sites' })
  async findAllSites(@Req() req: Request, @Param('id') id: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('projects', { method: 'GET', path: `/construction-sites`, headers: { authorization: req.headers.authorization || '' }, params: { page, limit, projectId: id } });
  }

  @Post(':id/construction-sites')
  @ApiOperation({ summary: 'Create construction site' })
  async createSite(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('projects', { method: 'POST', path: `/construction-sites`, headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' }, data: { ...body, projectId: +id } });
  }

  @Put(':id/construction-sites/:siteId')
  @ApiOperation({ summary: 'Update construction site' })
  async updateSite(@Req() req: Request, @Param('siteId') siteId: string, @Body() body: any) {
    return this.proxyService.forward('projects', { method: 'PUT', path: `/construction-sites/${siteId}`, headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' }, data: body });
  }

  @Delete(':id/construction-sites/:siteId')
  @ApiOperation({ summary: 'Delete construction site' })
  async removeSite(@Req() req: Request, @Param('siteId') siteId: string) {
    return this.proxyService.forward('projects', { method: 'DELETE', path: `/construction-sites/${siteId}`, headers: { authorization: req.headers.authorization || '' } });
  }

  // User Assignments
  @Get(':id/assignments')
  @ApiOperation({ summary: 'Get project user assignments' })
  async findAllAssignments(@Req() req: Request, @Param('id') id: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.proxyService.forward('projects', { method: 'GET', path: `/user-assignments`, headers: { authorization: req.headers.authorization || '' }, params: { page, limit, projectId: id } });
  }

  @Post(':id/assignments')
  @ApiOperation({ summary: 'Create user assignment' })
  async createAssignment(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    return this.proxyService.forward('projects', { method: 'POST', path: `/user-assignments`, headers: { authorization: req.headers.authorization || '', 'content-type': 'application/json' }, data: { ...body, projectId: +id } });
  }

  @Delete(':id/assignments/:assignmentId')
  @ApiOperation({ summary: 'Delete user assignment' })
  async removeAssignment(@Req() req: Request, @Param('assignmentId') assignmentId: string) {
    return this.proxyService.forward('projects', { method: 'DELETE', path: `/user-assignments/${assignmentId}`, headers: { authorization: req.headers.authorization || '' } });
  }
}
